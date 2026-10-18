const admin = require('firebase-admin');
const { existsSync } = require('node:fs');
const { join } = require('node:path');

const serviceAccountPath = join(__dirname, '..', 'serviceAccountKey.json');

if (!admin.apps.length && existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('[FIRESTORE] Inicializado correctamente');
  } catch (err) {
    console.warn('[FIRESTORE] Error inicializando:', err.message);
    console.warn('[FIRESTORE] Usando SQLite como fallback');
  }
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const nowIso = () => new Date().toISOString();

// --- Plans helpers ---

function planFromDoc(doc) {
  const data = doc.data() || {};
  return {
    id: data.id || doc.id,
    name: data.name,
    type: data.type,
    price: data.price,
    currency: data.currency,
    limits: data.limits || {},
    features: data.features || [],
    watermark: data.watermark !== false,
    active: data.active !== false,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
}

// --- Users ---

const users = {
  async insert(user) {
    const now = nowIso();
    const ref = user.id ? db.collection('users').doc(user.id) : db.collection('users').doc();
    const data = {
      id: user.id || ref.id,
      email: user.email,
      password_hash: user.password_hash || null,
      password_hash_v2: user.password_hash_v2 || null,
      name: user.name || '',
      plan: user.plan || 'free',
      role: user.role || 'member',
      status: user.status || 'active',
      created_at: user.created_at || now,
      updated_at: user.updated_at || now
    };
    await ref.set(data);
    return { lastID: ref.id, changes: 1 };
  },

  async findByEmail(email) {
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    return snapshot.empty ? null : snapshot.docs[0].data();
  },

  async findById(id) {
    const doc = await db.collection('users').doc(id).get();
    return doc.exists ? doc.data() : null;
  },

  async list() {
    const snapshot = await db.collection('users').orderBy('created_at', 'desc').get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id || doc.id,
        email: data.email,
        name: data.name,
        plan: data.plan,
        role: data.role,
        status: data.status,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    });
  },

  async count() {
    const snapshot = await db.collection('users').count().get();
    return snapshot.data().count;
  },

  async ensureAdmin() {
    const adminSnapshot = await db.collection('users').where('role', '==', 'admin').limit(1).get();
    if (!adminSnapshot.empty) {
      return adminSnapshot.docs[0].data().id;
    }
    const firstSnapshot = await db.collection('users').orderBy('created_at').limit(1).get();
    if (firstSnapshot.empty) return null;
    const firstUser = firstSnapshot.docs[0];
    await db.collection('users').doc(firstUser.id).update({
      role: 'admin',
      updated_at: nowIso()
    });
    return firstUser.id;
  },

  async updatePlan(userId, plan, updatedAt) {
    await db.collection('users').doc(userId).update({
      plan,
      updated_at: updatedAt || nowIso()
    });
    return { changes: 1 };
  },

  async updateMembership(id, fields) {
    const allowed = new Set(['name', 'plan', 'role', 'status']);
    const entries = Object.entries(fields || {}).filter(([key]) => allowed.has(key));
    if (!entries.length) return Promise.resolve({ changes: 0 });
    const updateData = {};
    for (const [key, value] of entries) {
      updateData[key] = value;
    }
    updateData.updated_at = nowIso();
    await db.collection('users').doc(id).update(updateData);
    return { changes: 1 };
  },

  async updateHashV2(userId, hash, updatedAt) {
    await db.collection('users').doc(userId).update({
      password_hash_v2: hash,
      password_hash: null,
      updated_at: updatedAt || nowIso()
    });
    return { changes: 1 };
  },

  async clearLegacyHash(userId, updatedAt) {
    await db.collection('users').doc(userId).update({
      password_hash: null,
      updated_at: updatedAt || nowIso()
    });
    return { changes: 1 };
  },

  async findLegacyUsers(limit = 100) {
    const snapshot = await db.collection('users')
      .where('password_hash', '!=', null)
      .where('password_hash', '!=', '')
      .where('password_hash_v2', '==', null)
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => doc.data()).slice(0, limit);
  },

  async updatePassword(email, hash) {
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snapshot.empty) return { changes: 0 };
    await snapshot.docs[0].ref.update({
      password_hash: hash,
      updated_at: nowIso()
    });
    return { changes: 1 };
  },

  async upsert(user) {
    const ref = db.collection('users').doc(user.id);
    const doc = await ref.get();
    const now = nowIso();
    const data = {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash || null,
      password_hash_v2: user.password_hash_v2 || null,
      name: user.name || '',
      plan: user.plan || 'free',
      role: user.role || 'member',
      status: user.status || 'active',
      created_at: doc.exists ? (doc.data().created_at || now) : (user.created_at || now),
      updated_at: now
    };
    await ref.set(data, { merge: true });
    return { lastID: user.id, changes: 1 };
  }
};

// --- Plans ---

const plans = {
  async list(activeOnly = false) {
    let query = db.collection('plans');
    if (activeOnly) {
      query = query.where('active', '==', true);
    }
    const snapshot = await query.orderBy('price').orderBy('name').get();
    return snapshot.docs.map(doc => planFromDoc(doc));
  },

  async findById(id) {
    const doc = await db.collection('plans').doc(id).get();
    return doc.exists ? planFromDoc(doc) : null;
  },

  async upsert(plan) {
    const now = nowIso();
    const data = {
      id: plan.id,
      name: plan.name,
      type: plan.type,
      price: plan.price,
      currency: plan.currency,
      limits: plan.limits || {},
      features: plan.features || [],
      watermark: plan.watermark ? true : false,
      active: plan.active === false ? false : true,
      created_at: now,
      updated_at: now
    };
    await db.collection('plans').doc(plan.id).set(data, { merge: true });
    return { lastID: plan.id, changes: 1 };
  },

  async getStats() {
    const plansSnapshot = await db.collection('plans').get();
    const stats = [];
    for (const planDoc of plansSnapshot.docs) {
      const planId = planDoc.id;
      const consultados = await db.collection('payments').where('plan_id', '==', planId).count().get();
      const concretados = await db.collection('payments').where('plan_id', '==', planId).where('status', '==', 'paid').count().get();
      const activeUsers = await db.collection('users').where('plan', '==', planId).where('status', '==', 'active').count().get();
      stats.push({
        plan_id: planId,
        consultados: consultados.data().count,
        concretados: concretados.data().count,
        active_users: activeUsers.data().count
      });
    }
    return stats;
  }
};

// --- Projects ---

const projects = {
  async insert(project) {
    const now = nowIso();
    const ref = project.id ? db.collection('projects').doc(project.id) : db.collection('projects').doc();
    const data = {
      id: project.id || ref.id,
      user_id: project.user_id,
      name: project.name,
      created_at: project.created_at || now,
      updated_at: project.updated_at || now
    };
    await ref.set(data);
    return { lastID: ref.id, changes: 1 };
  },

  async findById(id) {
    const doc = await db.collection('projects').doc(id).get();
    return doc.exists ? doc.data() : null;
  },

  async findByUser(userId) {
    const snapshot = await db.collection('projects').where('user_id', '==', userId).orderBy('updated_at', 'desc').get();
    return snapshot.docs.map(doc => doc.data());
  },

  async deleteById(id) {
    await db.collection('projects').doc(id).delete();
    return { changes: 1 };
  }
};

// --- Expedientes ---

const expedientes = {
  async insert(expediente) {
    const now = nowIso();
    const ref = expediente.id ? db.collection('expedientes').doc(expediente.id) : db.collection('expedientes').doc();
    const data = {
      id: expediente.id || ref.id,
      project_id: expediente.project_id,
      name: expediente.name,
      state_json: expediente.state_json || null,
      validation_results: expediente.validation_results || null,
      files_json: expediente.files_json || null,
      created_at: expediente.created_at || now,
      updated_at: expediente.updated_at || now
    };
    await ref.set(data);
    return { lastID: ref.id, changes: 1 };
  },

  async findById(id) {
    const doc = await db.collection('expedientes').doc(id).get();
    return doc.exists ? doc.data() : null;
  },

  async findByProject(projectId) {
    const snapshot = await db.collection('expedientes').where('project_id', '==', projectId).orderBy('updated_at', 'desc').get();
    return snapshot.docs.map(doc => doc.data());
  },

  async deleteByProject(projectId) {
    const snapshot = await db.collection('expedientes').where('project_id', '==', projectId).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    return { changes: snapshot.size };
  },

  async deleteById(id) {
    await db.collection('expedientes').doc(id).delete();
    return { changes: 1 };
  },

  async update(id, fields) {
    const allowed = new Set(['name', 'state_json', 'validation_results', 'files_json']);
    const updateData = { updated_at: nowIso() };
    for (const key of Object.keys(fields || {})) {
      if (allowed.has(key)) {
        updateData[key] = fields[key];
      }
    }
    await db.collection('expedientes').doc(id).update(updateData);
    return { changes: 1 };
  }
};

// --- Payments ---

const payments = {
  async insert(payment) {
    const now = nowIso();
    const ref = payment.id ? db.collection('payments').doc(payment.id) : db.collection('payments').doc();
    const data = {
      id: payment.id || ref.id,
      user_id: payment.user_id,
      plan_id: payment.plan_id,
      provider: payment.provider || 'manual',
      status: payment.status || 'pending',
      amount: payment.amount,
      currency: payment.currency || 'PYG',
      buyer: payment.buyer ? JSON.stringify(payment.buyer) : null,
      paid_at: payment.paid_at || null,
      created_at: payment.created_at || now,
      provider_id: payment.provider_id || null,
      webhook_status: payment.webhook_status || null,
      webhook_data: payment.webhook_data || null
    };
    await ref.set(data);
    return { lastID: ref.id, changes: 1 };
  },

  async findById(id) {
    const doc = await db.collection('payments').doc(id).get();
    return doc.exists ? doc.data() : null;
  },

  async updateStatus(id, status, paidAt) {
    await db.collection('payments').doc(id).update({
      status,
      paid_at: paidAt
    });
    return { changes: 1 };
  },

  async updateProvider(id, providerId, webhookStatus = null, webhookData = null) {
    await db.collection('payments').doc(id).update({ provider_id: providerId || null, webhook_status: webhookStatus, webhook_data: webhookData });
    return { changes: 1 };
  },

  async findByProviderId(providerId) {
    const snapshot = await db.collection('payments').where('provider_id', '==', providerId).limit(1).get();
    return snapshot.empty ? null : snapshot.docs[0].data();
  },

  async list() {
    const snapshot = await db.collection('payments').orderBy('created_at', 'desc').get();
    return snapshot.docs.map(doc => doc.data());
  }
};

// --- Usage ---

const usage = {
  async get(key) {
    const doc = await db.collection('usage').doc(key).get();
    return doc.exists ? (doc.data().value || 0) : 0;
  },

  async increment(key) {
    const ref = db.collection('usage').doc(key);
    const doc = await ref.get();
    const current = doc.exists ? (doc.data().value || 0) : 0;
    await ref.set({
      value: current + 1,
      updated_at: nowIso()
    }, { merge: true });
    return { changes: 1 };
  }
};

// --- Public Reports ---

const public_reports = {
  async insert(report) {
    const now = nowIso();
    const ref = report.id ? db.collection('public_reports').doc(report.id) : db.collection('public_reports').doc();
    const data = {
      id: report.id || ref.id,
      user_id: report.user_id,
      html_content: report.html_content,
      created_at: report.created_at || now
    };
    await ref.set(data);
    return { lastID: ref.id, changes: 1 };
  },

  async findById(id) {
    const doc = await db.collection('public_reports').doc(id).get();
    return doc.exists ? doc.data() : null;
  }
};

// --- Recovery ---

const recovery = {
  async insert(data) {
    await db.collection('recovery_tokens').doc(data.token).set({
      email: data.email,
      expires_at: data.expires_at
    });
    return { lastID: data.token, changes: 1 };
  },

  async findByToken(token) {
    const doc = await db.collection('recovery_tokens').doc(token).get();
    return doc.exists ? doc.data() : null;
  },

  async deleteByToken(token) {
    await db.collection('recovery_tokens').doc(token).delete();
    return { changes: 1 };
  },

  async deleteByEmail(email) {
    const snapshot = await db.collection('recovery_tokens').where('email', '==', email).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    return { changes: snapshot.size };
  }
};

function migrateFromJson() {
  return Promise.resolve();
}

function runJsonMigration() {
  return Promise.resolve();
}

const dbAPI = { users, plans, projects, expedientes, payments, usage, public_reports, recovery };

module.exports = { dbAPI, migrateFromJson, runJsonMigration };
