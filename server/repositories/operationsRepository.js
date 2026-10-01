import crypto from 'node:crypto';
import argon2 from 'argon2';
import { prisma } from '../db/client.js';

export const SERVICE_STATUSES = [
  'booked', 'awaiting_processing', 'washing', 'drying', 'ironing',
  'ready_for_collection', 'completed', 'cancelled',
];

const legacyStatus = { new: 'booked', confirmed: 'awaiting_processing' };
const normalizeStatus = (status) => legacyStatus[status] || status;
const publicUser = { id: true, email: true, username: true, name: true, role: true, active: true, createdAt: true };
const bookingInclude = {
  items: true,
  customer: true,
  createdBy: { select: publicUser },
  closedBy: { select: publicUser },
  statusHistory: { include: { changedBy: { select: publicUser } }, orderBy: { changedAt: 'asc' } },
  payments: { include: { receivedBy: { select: publicUser }, receipt: true }, orderBy: { createdAt: 'asc' } },
  notifications: { orderBy: { createdAt: 'desc' } },
  receipt: true,
};

function dateRange(from, to) {
  if (!from && !to) return undefined;
  const range = {};
  if (from) range.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) range.lte = new Date(`${to}T23:59:59.999Z`);
  return range;
}

async function audit(tx, userId, action, entity, entityId, details) {
  return tx.auditLog.create({
    data: { userId: userId || null, action, entity, entityId, details: details ? JSON.stringify(details) : null },
  });
}

export const operationsRepository = {
  normalizeStatus,

  async createUser(data, actorId) {
    const passwordHash = await argon2.hash(data.password);
    return prisma.$transaction(async (tx) => {
      const user = await tx.adminUser.create({
        data: {
          email: data.email.toLowerCase(),
          username: data.username?.toLowerCase() || null,
          name: data.name || null,
          role: data.role,
          passwordHash,
        },
        select: publicUser,
      });
      await audit(tx, actorId, 'user.created', 'user', user.id, { role: user.role });
      return user;
    });
  },

  listUsers() {
    return prisma.adminUser.findMany({ select: publicUser, orderBy: { createdAt: 'asc' } });
  },

  async updateUser(id, data, actorId) {
    const update = {};
    for (const key of ['name', 'role', 'active']) if (data[key] !== undefined) update[key] = data[key];
    if (data.password) update.passwordHash = await argon2.hash(data.password);
    return prisma.$transaction(async (tx) => {
      const user = await tx.adminUser.update({ where: { id }, data: update, select: publicUser });
      await audit(tx, actorId, 'user.updated', 'user', id, { fields: Object.keys(update).filter((x) => x !== 'passwordHash') });
      return user;
    });
  },

  async createCustomer(data, actorId) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findFirst({ where: { phone: data.phone } });
      if (existing) throw Object.assign(new Error('A customer with this contact number is already registered.'), { status: 409 });
      let customerCode;
      do customerCode = `CUS-${crypto.randomInt(100000, 999999)}`;
      while (await tx.customer.findUnique({ where: { customerCode } }));
      const customer = await tx.customer.create({
        data: { customerCode, ...data, createdById: actorId || null },
        include: { createdBy: { select: publicUser } },
      });
      await audit(tx, actorId, 'customer.created', 'customer', customer.id);
      return customer;
    });
  },

  searchCustomers(query = '') {
    const q = query.trim();
    return prisma.customer.findMany({
      where: q ? { OR: [
        { name: { contains: q } }, { phone: { contains: q } }, { customerCode: { contains: q } },
      ] } : {},
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { createdBy: { select: publicUser } },
    });
  },

  async deleteCustomer(id, actorId) {
    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id }, include: { _count: { select: { bookings: true } } } });
      if (!customer) throw Object.assign(new Error('Customer not found.'), { status: 404 });
      if (customer._count.bookings > 0) {
        throw Object.assign(new Error('Customers linked to bookings cannot be deleted.'), { status: 409 });
      }
      await audit(tx, actorId, 'customer.deleted', 'customer', id, { customerCode: customer.customerCode, name: customer.name });
      await tx.customer.delete({ where: { id } });
      return { ok: true };
    });
  },

  async attachCustomerToBooking(bookingId, customerId, actorId) {
    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUniqueOrThrow({ where: { id: customerId } });
      const booking = await tx.bookingRequest.update({
        where: { id: bookingId },
        data: { customerId, name: customer.name, phone: customer.phone },
        include: bookingInclude,
      });
      await audit(tx, actorId, 'booking.customer_attached', 'booking', bookingId, { customerId });
      return booking;
    });
  },

  async setInitialAccountability(bookingId, userId, customerId = null) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.bookingRequest.update({
        where: { id: bookingId },
        data: { createdById: userId || null, customerId, status: 'booked' },
      });
      await tx.bookingStatusHistory.create({ data: { bookingId, status: 'booked', changedById: userId || null } });
      await audit(tx, userId, 'booking.created', 'booking', bookingId);
      return booking;
    });
  },

  async getBooking(id) {
    return prisma.bookingRequest.findUnique({ where: { id }, include: bookingInclude });
  },

  async searchBookings(filters = {}) {
    const q = filters.q?.trim();
    const status = filters.status ? normalizeStatus(filters.status) : null;
    const createdAt = dateRange(filters.from, filters.to);
    return prisma.bookingRequest.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(filters.attendantId ? { createdById: filters.attendantId } : {}),
        ...(createdAt ? { createdAt } : {}),
        ...(q ? { OR: [
          { receiptNumber: { contains: q } }, { name: { contains: q } }, { phone: { contains: q } },
          { payments: { some: { mpesaReference: { contains: q } } } },
        ] } : {}),
      },
      include: bookingInclude,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(filters.limit) || 100, 500),
    });
  },

  async updateStatus(id, requestedStatus, userId, note = null) {
    const status = normalizeStatus(requestedStatus);
    if (!SERVICE_STATUSES.includes(status)) throw Object.assign(new Error('Invalid service status.'), { status: 400 });
    if (status === 'completed') throw Object.assign(new Error('Complete a service by recording its payment.'), { status: 409 });
    return prisma.$transaction(async (tx) => {
      const booking = await tx.bookingRequest.findUniqueOrThrow({ where: { id } });
      const processing = ['washing', 'drying', 'ironing'];
      if (status === 'ready_for_collection' && !processing.includes(normalizeStatus(booking.status))) {
        throw Object.assign(new Error('A service can only be marked ready after processing has started.'), { status: 409 });
      }
      const updated = await tx.bookingRequest.update({ where: { id }, data: { status } });
      await tx.bookingStatusHistory.create({ data: { bookingId: id, status, note, changedById: userId } });
      await audit(tx, userId, 'booking.status_updated', 'booking', id, { from: booking.status, to: status });
      return updated;
    });
  },

  async recordPayment(bookingId, data, userId, idempotencyKey = null) {
    if (!['Cash', 'M-Pesa'].includes(data.method)) throw Object.assign(new Error('Payment method must be Cash or M-Pesa.'), { status: 400 });
    const amount = Number(data.amount);
    if (!Number.isInteger(amount) || amount <= 0) throw Object.assign(new Error('Payment amount must be a positive whole number.'), { status: 400 });
    const reference = data.method === 'M-Pesa' ? String(data.mpesaReference || '').trim().toUpperCase() : null;
    if (data.method === 'M-Pesa' && !reference) throw Object.assign(new Error('M-Pesa transaction reference is required.'), { status: 400 });
    return prisma.$transaction(async (tx) => {
      if (idempotencyKey) {
        const prior = await tx.payment.findUnique({ where: { idempotencyKey }, include: { receipt: true } });
        if (prior) return prior;
      }
      const booking = await tx.bookingRequest.findUnique({ where: { id: bookingId }, include: { payments: true } });
      if (!booking) throw Object.assign(new Error('Booking not found.'), { status: 404 });
      if (booking.status === 'cancelled') throw Object.assign(new Error('Cancelled services cannot be paid.'), { status: 409 });
      if (booking.status === 'completed' || booking.closedAt) throw Object.assign(new Error('Service is already closed.'), { status: 409 });
      const alreadyPaid = booking.payments.reduce((sum, payment) => sum + payment.amount, 0);
      if (alreadyPaid >= booking.estimatedTotal) throw Object.assign(new Error('This booking is already fully paid. The payment option is locked.'), { status: 409 });
      if (alreadyPaid + amount < booking.estimatedTotal) throw Object.assign(new Error('Full payment is required before service closure.'), { status: 409 });
      const amountReceived = data.method === 'Cash' ? Number(data.amountReceived ?? amount) : null;
      if (data.method === 'Cash' && amountReceived < amount) throw Object.assign(new Error('Amount received cannot be less than amount paid.'), { status: 400 });
      const payment = await tx.payment.create({
        data: { bookingId, amount, method: data.method, amountReceived, changeGiven: amountReceived === null ? null : amountReceived - amount, mpesaReference: reference, receivedById: userId, idempotencyKey },
      });
      const receiptNumber = booking.receiptNumber;
      const receipt = await tx.receipt.create({ data: { receiptNumber, bookingId, paymentId: payment.id } });
      const closeBooking = data.closeBooking !== false;
      await tx.bookingRequest.update({
        where: { id: bookingId },
        data: closeBooking
          ? { paymentStatus: 'paid', paymentMethod: data.method, status: 'completed', closedAt: new Date(), closedById: userId }
          : { paymentStatus: 'paid', paymentMethod: data.method },
      });
      if (closeBooking) {
        await tx.bookingStatusHistory.create({ data: { bookingId, status: 'completed', note: 'Payment recorded and service collected.', changedById: userId } });
      }
      await audit(tx, userId, 'payment.recorded', 'payment', payment.id, { bookingId, amount, method: data.method, closeBooking });
      if (closeBooking) await audit(tx, userId, 'booking.closed', 'booking', bookingId);
      return { ...payment, receipt, bookingClosed: closeBooking };
    });
  },

  async createNotification(bookingId, data, userId) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.bookingRequest.findUnique({ where: { id: bookingId }, include: { customer: true } });
      if (!booking) throw Object.assign(new Error('Booking not found.'), { status: 404 });
      if (booking.status !== 'ready_for_collection') throw Object.assign(new Error('Notifications can only be sent when a service is ready for collection.'), { status: 409 });
      const phone = booking.customer?.phone || booking.phone;
      if (!phone) throw Object.assign(new Error('Customer has no registered phone number.'), { status: 409 });
      const channel = String(data.channel || '').toLowerCase();
      if (!['sms', 'whatsapp'].includes(channel)) throw Object.assign(new Error('Notification channel must be SMS or WhatsApp.'), { status: 400 });
      const settings = await tx.siteSettings.findFirst();
      const message = data.message || `Hello ${booking.name}, your laundry is ready for collection. Kindly visit us at your convenience. Thank you for choosing ${settings?.businessName || 'Open Doors Laundromat'}.`;
      // Provider integration is deliberately optional: without a configured provider,
      // persist the message for reliable offline delivery.
      const notification = await tx.notification.create({ data: { bookingId, customerId: booking.customerId, phone, channel, message, status: 'queued', initiatedById: userId } });
      await audit(tx, userId, 'notification.queued', 'notification', notification.id, { bookingId, channel });
      return notification;
    });
  },

  async reports(filters = {}) {
    const createdAt = dateRange(filters.from, filters.to);
    const bookingWhere = {
      ...(createdAt ? { createdAt } : {}),
      ...(filters.attendantId ? { createdById: filters.attendantId } : {}),
      ...(filters.status ? { status: normalizeStatus(filters.status) } : {}),
      ...(filters.service ? { items: { some: { service: filters.service } } } : {}),
    };
    const paymentWhere = {
      ...(createdAt ? { createdAt } : {}),
      ...(filters.attendantId ? { receivedById: filters.attendantId } : {}),
      ...(filters.method ? { method: filters.method } : {}),
      ...(filters.service ? { booking: { items: { some: { service: filters.service } } } } : {}),
    };
    const [bookings, payments, attendants] = await Promise.all([
      prisma.bookingRequest.findMany({ where: bookingWhere, include: { items: true, createdBy: { select: publicUser } } }),
      prisma.payment.findMany({ where: paymentWhere, include: { booking: { include: { items: true, customer: true } }, receivedBy: { select: publicUser }, receipt: true }, orderBy: { createdAt: 'desc' } }),
      prisma.adminUser.findMany({ select: publicUser }),
    ]);
    const services = new Map();
    for (const booking of bookings) for (const item of booking.items) {
      const row = services.get(item.service) || { service: item.service, booked: 0, completed: 0, pending: 0, revenue: 0 };
      row.booked += 1;
      if (booking.status === 'completed') { row.completed += 1; row.revenue += item.subtotal; } else if (booking.status !== 'cancelled') row.pending += 1;
      services.set(item.service, row);
    }
    const attendantActivity = attendants.map((user) => {
      const logged = bookings.filter((x) => x.createdById === user.id);
      const handled = payments.filter((x) => x.receivedById === user.id);
      return { attendant: user, servicesLogged: logged.length, servicesCompleted: logged.filter((x) => x.status === 'completed').length, paymentsReceived: handled.length, transactionValue: handled.reduce((s, x) => s + x.amount, 0), pendingServices: logged.filter((x) => !['completed', 'cancelled'].includes(x.status)).length };
    });
    const cash = payments.filter((x) => x.method === 'Cash');
    const mpesa = payments.filter((x) => x.method === 'M-Pesa');
    return {
      summary: { totalTransactions: payments.length, totalRevenue: payments.reduce((s, x) => s + x.amount, 0), totalCash: cash.reduce((s, x) => s + x.amount, 0), totalMpesa: mpesa.reduce((s, x) => s + x.amount, 0) },
      transactions: payments,
      services: [...services.values()],
      attendantActivity,
      pending: bookings.filter((x) => !['completed', 'cancelled'].includes(x.status)),
    };
  },

  async dashboard() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const [today, active, ready, collected, payments] = await Promise.all([
      prisma.bookingRequest.count({ where: { createdAt: { gte: start } } }),
      prisma.bookingRequest.count({ where: { status: { in: SERVICE_STATUSES.filter((x) => !['completed', 'cancelled', 'ready_for_collection'].includes(x)) } } }),
      prisma.bookingRequest.count({ where: { status: 'ready_for_collection' } }),
      prisma.bookingRequest.count({ where: { status: 'completed', closedAt: { gte: start } } }),
      prisma.payment.findMany({ where: { createdAt: { gte: start } } }),
    ]);
    return { servicesBookedToday: today, servicesInProgress: active, readyForCollection: ready, collectedToday: collected, todayRevenue: payments.reduce((s, x) => s + x.amount, 0), cashToday: payments.filter((x) => x.method === 'Cash').reduce((s, x) => s + x.amount, 0), mpesaToday: payments.filter((x) => x.method === 'M-Pesa').reduce((s, x) => s + x.amount, 0) };
  },

  auditLogs(limit = 200) {
    return prisma.auditLog.findMany({ include: { user: { select: publicUser } }, orderBy: { createdAt: 'desc' }, take: Math.min(Number(limit) || 200, 1000) });
  },
};
