import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const PASSWORD_HASH_BYTES = 64;
const workerBasicCategories = new Set([
  'company',
  'subLocation',
  'governorate',
  'trainingCenter',
  'rank',
  'weapon',
  'leaveType',
]);
const personTypes = new Set(['soldier', 'officer', 'nco']);
const personHistoryTypes = new Set([
  'punishment',
  'detention',
  'absence',
  'leave',
  'transfer',
  'struckOff',
  'dismissed',
  'medical',
]);
const personTables = {
  soldier: 'soldiers',
  officer: 'officers',
  nco: 'non_commissioned_officers',
};
const egyptianGovernorates = [
  'القاهرة',
  'الإسكندرية',
  'بورسعيد',
  'السويس',
  'دمياط',
  'الدقهلية',
  'الشرقية',
  'القليوبية',
  'كفر الشيخ',
  'الغربية',
  'المنوفية',
  'البحيرة',
  'الإسماعيلية',
  'الجيزة',
  'بني سويف',
  'الفيوم',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'أسوان',
  'الأقصر',
  'البحر الأحمر',
  'الوادي الجديد',
  'مطروح',
  'شمال سيناء',
  'جنوب سيناء',
];

const text = value => String(value ?? '').trim();
const isISODate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const makePasswordHash = password => {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, 310000, PASSWORD_HASH_BYTES, 'sha512');
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
};

const verifyPassword = (password, storedHash) => {
  const [saltHex, hashHex] = String(storedHash || '').split(':');
  if (!saltHex || !hashHex || !/^[a-f0-9]{32}$/i.test(saltHex) || !/^[a-f0-9]{128}$/i.test(hashHex)) {
    return false;
  }
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = pbkdf2Sync(password, salt, 310000, PASSWORD_HASH_BYTES, 'sha512');
  return timingSafeEqual(actual, expected);
};

const workerFromRow = row => ({
  militaryNumber: row.military_number,
  rank: row.rank,
  fullName: row.full_name,
  company: row.company,
  subLocation: row.sub_location,
  nationalId: row.national_id,
  tripleNumber: row.triple_number,
  joinDate: row.join_date,
  dischargeDate: row.discharge_date,
  enlistmentDate: row.enlistment_date,
  governorate: row.governorate,
  district: row.district,
  religion: row.religion,
  trainingCenter: row.training_center,
  weapon: row.weapon,
  phone: row.phone,
  monthlyStatus: row.monthly_status,
  notes: row.notes,
  isAdmin: Boolean(row.has_user_account),
  mustChangePassword: Boolean(row.must_change_password),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const normalizeWorker = input => ({
  militaryNumber: text(input.militaryNumber),
  rank: text(input.rank),
  fullName: text(input.fullName),
  company: text(input.company),
  subLocation: text(input.subLocation),
  nationalId: text(input.nationalId),
  tripleNumber: text(input.tripleNumber),
  joinDate: text(input.joinDate),
  dischargeDate: text(input.dischargeDate),
  enlistmentDate: text(input.enlistmentDate),
  governorate: text(input.governorate),
  district: text(input.district),
  religion: text(input.religion),
  trainingCenter: text(input.trainingCenter),
  weapon: text(input.weapon),
});

const validateWorker = worker => {
  if (!worker.militaryNumber || worker.militaryNumber.length > 100) return 'الرقم العسكري مطلوب وبحد أقصى 100 حرف.';
  if (!worker.fullName || worker.fullName.length > 200) return 'اسم المجند مطلوب وبحد أقصى 200 حرف.';
  if (worker.rank.length > 100 || worker.company.length > 200 || worker.subLocation.length > 200
    || worker.nationalId.length > 100 || worker.tripleNumber.length > 100
    || worker.joinDate.length > 32 || worker.dischargeDate.length > 32
    || worker.enlistmentDate.length > 32 || worker.governorate.length > 150
    || worker.district.length > 150 || worker.religion.length > 100
    || worker.trainingCenter.length > 200 || worker.weapon.length > 150) {
    return 'تجاوز أحد الحقول الحد الأقصى المسموح به.';
  }
  if (worker.religion && !['مسلم', 'مسيحي'].includes(worker.religion)) {
    return 'يجب أن تكون الديانة مسلم أو مسيحي.';
  }
  return null;
};

export class WorkerDatabase {
  constructor(databasePath) {
    this.databasePath = databasePath;
    this.database = new DatabaseSync(databasePath);
    this.database.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
    `);
    const tables = new Set(this.database.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
    ).all().map(row => row.name));
    if (tables.has('workers')) {
      this.database.exec(`
        CREATE TABLE IF NOT EXISTS users (
          user_id INTEGER PRIMARY KEY,
          worker_id TEXT NOT NULL UNIQUE REFERENCES workers(worker_id) ON UPDATE CASCADE ON DELETE CASCADE,
          password_hash TEXT NOT NULL,
          must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1)),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS worker_leaves (
          id INTEGER PRIMARY KEY,
          worker_id TEXT NOT NULL REFERENCES workers(worker_id) ON UPDATE CASCADE ON DELETE CASCADE,
          leave_type TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          duration TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS worker_transfers (
          id INTEGER PRIMARY KEY,
          worker_id TEXT NOT NULL REFERENCES workers(worker_id) ON UPDATE CASCADE ON DELETE CASCADE,
          effective_date TEXT NOT NULL,
          from_location TEXT NOT NULL,
          to_location TEXT NOT NULL,
          reason TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );
      `);
      this.migrateWorkerAccounts();
      this.migrateWorkersToSoldiers();
    } else {
      this.database.exec(`
        CREATE TABLE IF NOT EXISTS soldiers (
          military_number TEXT PRIMARY KEY,
          rank TEXT NOT NULL DEFAULT '',
          full_name TEXT NOT NULL,
          company TEXT NOT NULL DEFAULT '',
          sub_location TEXT NOT NULL DEFAULT '',
          base_sub_location TEXT NOT NULL DEFAULT '',
          national_id TEXT NOT NULL DEFAULT '',
          triple_number TEXT NOT NULL DEFAULT '',
          join_date TEXT NOT NULL DEFAULT '',
          discharge_date TEXT NOT NULL DEFAULT '',
          enlistment_date TEXT NOT NULL DEFAULT '',
          governorate TEXT NOT NULL DEFAULT '',
          district TEXT NOT NULL DEFAULT '',
          religion TEXT NOT NULL DEFAULT '',
          training_center TEXT NOT NULL DEFAULT '',
          weapon TEXT NOT NULL DEFAULT '',
          phone TEXT NOT NULL DEFAULT '',
          monthly_status TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS users (
          user_id INTEGER PRIMARY KEY,
          military_number TEXT NOT NULL UNIQUE REFERENCES soldiers(military_number) ON UPDATE CASCADE ON DELETE CASCADE,
          password_hash TEXT NOT NULL,
          must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1)),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS worker_leaves (
          id INTEGER PRIMARY KEY,
          worker_id TEXT NOT NULL REFERENCES soldiers(military_number) ON UPDATE CASCADE ON DELETE CASCADE,
          leave_type TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          duration TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS worker_transfers (
          id INTEGER PRIMARY KEY,
          worker_id TEXT NOT NULL REFERENCES soldiers(military_number) ON UPDATE CASCADE ON DELETE CASCADE,
          effective_date TEXT NOT NULL,
          from_location TEXT NOT NULL,
          to_location TEXT NOT NULL,
          reason TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );
      `);
    }

    const leaveColumns = new Set(
      this.database.prepare('PRAGMA table_info(worker_leaves)').all().map(column => column.name),
    );
    if (!leaveColumns.has('duration')) {
      this.database.exec("ALTER TABLE worker_leaves ADD COLUMN duration TEXT NOT NULL DEFAULT ''");
    }

    this.database.exec(`
      CREATE INDEX IF NOT EXISTS soldiers_name_idx ON soldiers(full_name);
      CREATE INDEX IF NOT EXISTS soldiers_national_id_idx ON soldiers(national_id);
      CREATE INDEX IF NOT EXISTS soldiers_military_number_idx ON soldiers(military_number);
      CREATE INDEX IF NOT EXISTS soldiers_company_idx ON soldiers(company);
      CREATE INDEX IF NOT EXISTS soldiers_sub_location_idx ON soldiers(sub_location);
      CREATE INDEX IF NOT EXISTS worker_leaves_worker_date_idx ON worker_leaves(worker_id, start_date DESC);
      CREATE INDEX IF NOT EXISTS worker_transfers_worker_date_idx ON worker_transfers(worker_id, effective_date DESC);
      CREATE TABLE IF NOT EXISTS worker_basics (
        category TEXT NOT NULL,
        value TEXT NOT NULL COLLATE NOCASE,
        company TEXT NOT NULL DEFAULT '',
        PRIMARY KEY (category, value, company)
      );
      CREATE TABLE IF NOT EXISTS officers (
        military_number TEXT PRIMARY KEY,
        seniority_number TEXT NOT NULL DEFAULT '',
        rank TEXT NOT NULL DEFAULT '',
        full_name TEXT NOT NULL,
        marital_status TEXT NOT NULL DEFAULT '',
        male_children INTEGER NOT NULL DEFAULT 0 CHECK (male_children >= 0),
        female_children INTEGER NOT NULL DEFAULT 0 CHECK (female_children >= 0),
        national_id TEXT NOT NULL DEFAULT '',
        company TEXT NOT NULL DEFAULT '',
        sub_location TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS non_commissioned_officers (
        military_number TEXT PRIMARY KEY,
        seniority_number TEXT NOT NULL DEFAULT '',
        degree TEXT NOT NULL DEFAULT '',
        full_name TEXT NOT NULL,
        marital_status TEXT NOT NULL DEFAULT '',
        male_children INTEGER NOT NULL DEFAULT 0 CHECK (male_children >= 0),
        female_children INTEGER NOT NULL DEFAULT 0 CHECK (female_children >= 0),
        national_id TEXT NOT NULL DEFAULT '',
        company TEXT NOT NULL DEFAULT '',
        sub_location TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS person_history (
        id INTEGER PRIMARY KEY,
        person_type TEXT NOT NULL CHECK (person_type IN ('soldier', 'officer', 'nco')),
        military_number TEXT NOT NULL,
        history_type TEXT NOT NULL CHECK (
          history_type IN ('punishment', 'detention', 'absence', 'leave', 'transfer', 'struckOff', 'dismissed', 'medical')
        ),
        event_date TEXT NOT NULL,
        end_date TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL,
        duration TEXT NOT NULL DEFAULT '',
        reason TEXT NOT NULL DEFAULT '',
        from_location TEXT NOT NULL DEFAULT '',
        to_location TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS person_history_person_date_idx
        ON person_history(person_type, military_number, event_date DESC, id DESC);
    `);
    if (!tables.has('worker_basics')) this.seedWorkerBasics();
  }

  seedWorkerBasics() {
    const insert = this.database.prepare(`
      INSERT OR IGNORE INTO worker_basics (category, value, company) VALUES (?, ?, ?)
    `);
    for (const governorate of egyptianGovernorates) {
      insert.run('governorate', governorate, '');
    }

    for (const [category, column] of [
      ['company', 'company'],
      ['rank', 'rank'],
      ['governorate', 'governorate'],
      ['trainingCenter', 'training_center'],
      ['weapon', 'weapon'],
    ]) {
      const values = this.database.prepare(`
        SELECT DISTINCT ${column} AS value FROM soldiers WHERE ${column} <> ''
      `).all();
      for (const row of values) insert.run(category, text(row.value), '');
    }
    const subLocations = this.database.prepare(`
      SELECT DISTINCT company, sub_location AS value
      FROM soldiers WHERE company <> '' AND sub_location <> ''
    `).all();
    for (const row of subLocations) {
      insert.run('subLocation', text(row.value), text(row.company));
    }
  }

  listWorkerBasics() {
    return this.database.prepare(`
      SELECT category, value, company FROM worker_basics
      ORDER BY category, company COLLATE NOCASE, value COLLATE NOCASE
    `).all().map(row => ({
      category: row.category,
      value: row.value,
      ...(row.category === 'subLocation' ? { company: row.company } : {}),
    }));
  }

  saveWorkerBasic(categoryValue, valueValue, companyValue = '') {
    const category = text(categoryValue);
    const value = text(valueValue);
    const company = text(companyValue);
    if (!workerBasicCategories.has(category)) throw new Error('نوع التعريف غير صالح.');
    if (!value || value.length > 200) throw new Error('الاسم مطلوب وبحد أقصى 200 حرف.');
    if (category === 'subLocation') {
      if (!company) throw new Error('اختر السرية المرتبطة بالمكان الفرعي.');
      if (!this.database.prepare(`
        SELECT 1 FROM worker_basics WHERE category = 'company' AND value = ?
      `).get(company)) {
        throw new Error('السرية المحددة غير موجودة.');
      }
    } else if (company) {
      throw new Error('لا يمكن ربط هذا التعريف بسرية.');
    }

    if (this.database.prepare(`
      SELECT 1 FROM worker_basics WHERE category = ? AND value = ? AND company = ?
    `).get(category, value, category === 'subLocation' ? company : '')) {
      throw new Error('هذا التعريف موجود بالفعل.');
    }
    this.database.prepare(`
      INSERT INTO worker_basics (category, value, company) VALUES (?, ?, ?)
    `).run(category, value, category === 'subLocation' ? company : '');
  }

  updateWorkerBasic(categoryValue, originalValueValue, valueValue, originalCompanyValue = '', companyValue = '') {
    const category = text(categoryValue);
    const originalValue = text(originalValueValue);
    const value = text(valueValue);
    const originalCompany = text(originalCompanyValue);
    const company = text(companyValue);
    if (!workerBasicCategories.has(category) || !originalValue) {
      throw new Error('بيانات التعريف غير صالحة.');
    }
    if (!value || value.length > 200) throw new Error('الاسم مطلوب وبحد أقصى 200 حرف.');
    if (category !== 'subLocation' && (originalCompany || company)) {
      throw new Error('لا يمكن ربط هذا التعريف بسرية.');
    }
    if (category === 'subLocation') {
      if (!company) throw new Error('اختر السرية المرتبطة بالمكان الفرعي.');
      if (!this.database.prepare(`
        SELECT 1 FROM worker_basics WHERE category = 'company' AND value = ?
      `).get(company)) {
        throw new Error('السرية المحددة غير موجودة.');
      }
    }

    const oldCompany = category === 'subLocation' ? originalCompany : '';
    const newCompany = category === 'subLocation' ? company : '';
    if (!this.database.prepare(`
      SELECT 1 FROM worker_basics WHERE category = ? AND value = ? AND company = ?
    `).get(category, originalValue, oldCompany)) {
      throw new Error('لم يتم العثور على التعريف المطلوب.');
    }
    if (this.database.prepare(`
      SELECT 1 FROM worker_basics
      WHERE category = ? AND value = ? AND company = ?
        AND NOT (value = ? AND company = ?)
    `).get(category, value, newCompany, originalValue, oldCompany)) {
      throw new Error('هذا التعريف موجود بالفعل.');
    }
    if (category === 'company' && this.database.prepare(`
      SELECT 1
      FROM worker_basics source
      JOIN worker_basics target
        ON target.category = 'subLocation'
        AND target.company = ?
        AND target.value = source.value
      WHERE source.category = 'subLocation' AND source.company = ?
      LIMIT 1
    `).get(value, originalValue)) {
      throw new Error('يوجد مكان فرعي بالاسم نفسه في السرية الجديدة.');
    }

    const soldierColumn = {
      company: 'company',
      subLocation: 'sub_location',
      rank: 'rank',
      governorate: 'governorate',
      trainingCenter: 'training_center',
      weapon: 'weapon',
    }[category];
    this.database.exec('BEGIN IMMEDIATE');
    try {
      if (category === 'company') {
        this.database.prepare(`
          UPDATE worker_basics SET company = ?
          WHERE category = 'subLocation' AND company = ?
        `).run(value, originalValue);
        this.database.prepare(`
          UPDATE soldiers SET company = ?, updated_at = ? WHERE company = ?
        `).run(value, new Date().toISOString(), originalValue);
      } else if (category === 'subLocation') {
        this.database.prepare(`
          UPDATE soldiers SET sub_location = ?, company = ?, updated_at = ?
          WHERE sub_location = ? AND company = ?
        `).run(value, newCompany, new Date().toISOString(), originalValue, oldCompany);
      } else if (soldierColumn) {
        this.database.prepare(`
          UPDATE soldiers SET ${soldierColumn} = ?, updated_at = ? WHERE ${soldierColumn} = ?
        `).run(value, new Date().toISOString(), originalValue);
      } else if (category === 'leaveType') {
        this.database.prepare('UPDATE worker_leaves SET leave_type = ? WHERE leave_type = ?')
          .run(value, originalValue);
        this.database.prepare(`
          UPDATE person_history SET title = ?
          WHERE history_type = 'leave' AND title = ?
        `).run(value, originalValue);
      }
      this.database.prepare(`
        UPDATE worker_basics SET value = ?, company = ?
        WHERE category = ? AND value = ? AND company = ?
      `).run(value, newCompany, category, originalValue, oldCompany);
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  deleteWorkerBasic(categoryValue, valueValue, companyValue = '') {
    const category = text(categoryValue);
    const value = text(valueValue);
    const company = text(companyValue);
    if (!workerBasicCategories.has(category) || !value) throw new Error('بيانات التعريف غير صالحة.');
    if (category === 'company') {
      const hasSubLocations = this.database.prepare(`
        SELECT 1 FROM worker_basics WHERE category = 'subLocation' AND company = ? LIMIT 1
      `).get(value);
      const hasWorkers = this.database.prepare(`
        SELECT 1 FROM soldiers WHERE company = ? LIMIT 1
      `).get(value);
      if (hasSubLocations || hasWorkers) {
        throw new Error('لا يمكن حذف السرية لأنها مرتبطة بمواقع فرعية أو ببيانات مجندين.');
      }
    }
    if (category === 'leaveType' && (
      this.database.prepare('SELECT 1 FROM worker_leaves WHERE leave_type = ? LIMIT 1').get(value)
      || this.database.prepare(`
        SELECT 1 FROM person_history WHERE history_type = 'leave' AND title = ? LIMIT 1
      `).get(value)
    )) {
      throw new Error('لا يمكن حذف نوع الإجازة لارتباطه بسجلات إجازة موجودة.');
    }
    const result = this.database.prepare(`
      DELETE FROM worker_basics WHERE category = ? AND value = ? AND company = ?
    `).run(category, value, category === 'subLocation' ? company : '');
    if (result.changes === 0) throw new Error('لم يتم العثور على التعريف المطلوب.');
  }

  listPersonnel(kind) {
    const table = kind === 'officers'
      ? 'officers'
      : kind === 'ncos'
        ? 'non_commissioned_officers'
        : '';
    if (!table) throw new Error('نوع جدول الأفراد غير صالح.');
    return this.database.prepare(`
      SELECT * FROM ${table} ORDER BY full_name COLLATE NOCASE, military_number
    `).all().map(row => ({
      militaryNumber: row.military_number,
      seniorityNumber: row.seniority_number,
      ...(kind === 'officers' ? { rank: row.rank } : { degree: row.degree }),
      fullName: row.full_name,
      maritalStatus: row.marital_status,
      maleChildren: row.male_children,
      femaleChildren: row.female_children,
      nationalId: row.national_id,
      company: row.company,
      subLocation: row.sub_location,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  savePersonnel(kind, input, originalMilitaryNumber = '') {
    const table = kind === 'officers'
      ? 'officers'
      : kind === 'ncos'
        ? 'non_commissioned_officers'
        : '';
    const gradeColumn = kind === 'officers' ? 'rank' : kind === 'ncos' ? 'degree' : '';
    const gradeValue = kind === 'officers' ? text(input?.rank) : text(input?.degree);
    if (!table || !gradeColumn) throw new Error('نوع جدول الأفراد غير صالح.');
    const record = {
      militaryNumber: text(input?.militaryNumber),
      seniorityNumber: text(input?.seniorityNumber),
      grade: gradeValue,
      fullName: text(input?.fullName),
      maritalStatus: text(input?.maritalStatus),
      maleChildren: input?.maleChildren === '' || input?.maleChildren == null ? 0 : Number(input.maleChildren),
      femaleChildren: input?.femaleChildren === '' || input?.femaleChildren == null ? 0 : Number(input.femaleChildren),
      nationalId: text(input?.nationalId),
      company: text(input?.company),
      subLocation: text(input?.subLocation),
    };
    if (!record.militaryNumber || record.militaryNumber.length > 100) {
      throw new Error('الرقم العسكري مطلوب وبحد أقصى 100 حرف.');
    }
    if (!record.fullName || record.fullName.length > 200) {
      throw new Error('الاسم مطلوب وبحد أقصى 200 حرف.');
    }
    if (record.seniorityNumber.length > 100 || record.grade.length > 100
      || record.maritalStatus.length > 100 || record.nationalId.length > 100
      || record.company.length > 200 || record.subLocation.length > 200) {
      throw new Error('تجاوز أحد الحقول الحد الأقصى المسموح به.');
    }
    for (const [label, count] of [
      ['عدد الذكور', record.maleChildren],
      ['عدد الإناث', record.femaleChildren],
    ]) {
      if (!Number.isSafeInteger(count) || count < 0 || count > 10000) {
        throw new Error(`${label} يجب أن يكون رقماً صحيحاً من 0 إلى 10000.`);
      }
    }

    const now = new Date().toISOString();
    const values = [
      record.militaryNumber, record.seniorityNumber, record.grade, record.fullName,
      record.maritalStatus, record.maleChildren, record.femaleChildren, record.nationalId,
      record.company, record.subLocation, now,
    ];
    if (originalMilitaryNumber) {
      const result = this.database.prepare(`
        UPDATE ${table} SET
          military_number = ?, seniority_number = ?, ${gradeColumn} = ?, full_name = ?,
          marital_status = ?, male_children = ?, female_children = ?, national_id = ?,
          company = ?, sub_location = ?, updated_at = ?
        WHERE military_number = ?
      `).run(...values, text(originalMilitaryNumber));
      if (result.changes === 0) throw new Error('لم يتم العثور على السجل المطلوب.');
      this.database.prepare(`
        UPDATE person_history SET military_number = ?
        WHERE person_type = ? AND military_number = ?
      `).run(record.militaryNumber, kind === 'officers' ? 'officer' : 'nco', text(originalMilitaryNumber));
      return;
    }
    this.database.prepare(`
      INSERT INTO ${table} (
        military_number, seniority_number, ${gradeColumn}, full_name, marital_status,
        male_children, female_children, national_id, company, sub_location, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...values.slice(0, -1), now, now);
  }

  importPersonnel(kind, records) {
    const table = kind === 'officers'
      ? 'officers'
      : kind === 'ncos'
        ? 'non_commissioned_officers'
        : '';
    if (!table) throw new Error('نوع جدول الأفراد غير صالح.');
    if (!Array.isArray(records) || records.length > 100000) {
      throw new Error('ملف الاستيراد غير صالح أو يحتوي على عدد كبير جداً من الصفوف.');
    }

    const errors = [];
    const seenMilitaryNumbers = new Set();
    let inserted = 0;
    let updated = 0;
    const findRecord = this.database.prepare(`SELECT 1 FROM ${table} WHERE military_number = ?`);
    this.database.exec('BEGIN IMMEDIATE');
    try {
      records.forEach((record, index) => {
        const militaryNumber = text(record?.militaryNumber);
        if (seenMilitaryNumbers.has(militaryNumber)) {
          errors.push({
            row: index + 2,
            militaryNumber,
            message: 'الرقم العسكري مكرر داخل ملف Excel.',
          });
          return;
        }

        const exists = militaryNumber ? Boolean(findRecord.get(militaryNumber)) : false;
        try {
          this.savePersonnel(kind, record, exists ? militaryNumber : '');
          seenMilitaryNumbers.add(militaryNumber);
          if (exists) updated += 1;
          else inserted += 1;
        } catch (error) {
          errors.push({
            row: index + 2,
            militaryNumber,
            message: error instanceof Error ? error.message : 'بيانات السجل غير صالحة.',
          });
        }
      });
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
    return { inserted, updated, failed: errors.length, errors: errors.slice(0, 100) };
  }

  deletePersonnel(kind, militaryNumberValue) {
    const table = kind === 'officers'
      ? 'officers'
      : kind === 'ncos'
        ? 'non_commissioned_officers'
        : '';
    const militaryNumber = text(militaryNumberValue);
    if (!table || !militaryNumber) throw new Error('بيانات السجل غير صالحة.');
    const result = this.database.prepare(`
      DELETE FROM ${table} WHERE military_number = ?
    `).run(militaryNumber);
    if (result.changes === 0) throw new Error('لم يتم العثور على السجل المطلوب.');
    this.database.prepare(`
      DELETE FROM person_history WHERE person_type = ? AND military_number = ?
    `).run(kind === 'officers' ? 'officer' : 'nco', militaryNumber);
  }

  migrateWorkerAccounts() {
    const workerColumns = new Set(
      this.database.prepare('PRAGMA table_info(workers)').all().map(column => column.name),
    );
    const legacyColumns = ['password_hash', 'is_admin', 'must_change_password']
      .filter(column => workerColumns.has(column));
    if (legacyColumns.length === 0) return;
    if (legacyColumns.length !== 3) {
      throw new Error('The worker table contains an incomplete legacy login schema.');
    }

    this.database.exec('BEGIN IMMEDIATE');
    try {
      this.database.exec(`
        INSERT INTO users (worker_id, password_hash, must_change_password, created_at, updated_at)
        SELECT worker_id, password_hash, must_change_password, created_at, updated_at
        FROM workers
        WHERE is_admin = 1;
        ALTER TABLE workers DROP COLUMN password_hash;
        ALTER TABLE workers DROP COLUMN is_admin;
        ALTER TABLE workers DROP COLUMN must_change_password;
      `);
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  migrateWorkersToSoldiers() {
    const columns = new Set(
      this.database.prepare('PRAGMA table_info(workers)').all().map(column => column.name),
    );
    if (!columns.has('worker_id')) return;
    this.database.exec('BEGIN IMMEDIATE');
    try {
      this.database.exec(`
        DROP INDEX IF EXISTS workers_name_idx;
        DROP INDEX IF EXISTS workers_national_id_idx;
        DROP INDEX IF EXISTS workers_department_idx;
        DROP INDEX IF EXISTS workers_location_idx;
        DROP INDEX IF EXISTS worker_leaves_worker_date_idx;
        DROP INDEX IF EXISTS worker_transfers_worker_date_idx;
        ALTER TABLE workers RENAME TO soldiers;
        ALTER TABLE soldiers RENAME COLUMN worker_id TO military_number;
        ALTER TABLE soldiers RENAME COLUMN degree TO rank;
        ALTER TABLE soldiers RENAME COLUMN department TO company;
        ALTER TABLE soldiers RENAME COLUMN location TO sub_location;
        ALTER TABLE soldiers RENAME COLUMN base_location TO base_sub_location;
        ALTER TABLE soldiers RENAME COLUMN entry_date TO join_date;
        ALTER TABLE users RENAME COLUMN worker_id TO military_number;
      `);
      for (const [name, definition] of [
        ['triple_number', "TEXT NOT NULL DEFAULT ''"],
        ['governorate', "TEXT NOT NULL DEFAULT ''"],
        ['district', "TEXT NOT NULL DEFAULT ''"],
        ['religion', "TEXT NOT NULL DEFAULT ''"],
        ['training_center', "TEXT NOT NULL DEFAULT ''"],
        ['weapon', "TEXT NOT NULL DEFAULT ''"],
      ]) {
        this.database.exec(`ALTER TABLE soldiers ADD COLUMN ${name} ${definition}`);
      }
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  close() {
    this.database.close();
  }

  clearAllData() {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      this.database.exec(`
        DELETE FROM worker_transfers;
        DELETE FROM worker_leaves;
        DELETE FROM person_history;
        DELETE FROM users;
        DELETE FROM soldiers;
        DELETE FROM officers;
        DELETE FROM non_commissioned_officers;
      `);
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  getSetupState() {
    const row = this.database.prepare('SELECT COUNT(*) AS count FROM users').get();
    return { setupRequired: row.count === 0 };
  }

  createInitialAdmin(input) {
    const worker = normalizeWorker(input);
    const issue = validateWorker(worker);
    const password = String(input.password ?? '');
    if (issue) throw new Error(issue);
    if (password.length < 8 || password.length > 256) {
      throw new Error('يجب أن تتكون كلمة المرور من 8 إلى 256 حرفاً.');
    }
    if (this.database.prepare('SELECT 1 FROM users LIMIT 1').get()) {
      throw new Error('تم إعداد التطبيق بالفعل.');
    }

    const now = new Date().toISOString();
    if (!this.getWorker(worker.militaryNumber)) {
      this.insertWorker(worker, now);
    }
    const result = this.database.prepare(`
      INSERT INTO users (military_number, password_hash, must_change_password, created_at, updated_at)
      VALUES (?, ?, 1, ?, ?)
    `).run(worker.militaryNumber, makePasswordHash(password), now, now);
    return {
      userId: Number(result.lastInsertRowid),
      worker: this.getWorker(worker.militaryNumber),
      mustChangePassword: true,
    };
  }

  authenticate(workerIdValue, passwordValue) {
    const workerId = text(workerIdValue);
    const password = String(passwordValue ?? '');
    if (!workerId || workerId.length > 100 || password.length > 256) return null;
    const row = this.database.prepare(`
      SELECT u.user_id, u.password_hash, u.must_change_password, w.*
      FROM users u JOIN soldiers w ON w.military_number = u.military_number
      WHERE u.military_number = ?
    `).get(workerId);
    if (!row || !verifyPassword(password, row.password_hash)) return null;
    return {
      userId: Number(row.user_id),
      worker: { ...workerFromRow({ ...row, has_user_account: 1 }), mustChangePassword: Boolean(row.must_change_password) },
      mustChangePassword: Boolean(row.must_change_password),
    };
  }

  getSessionWorker(userId) {
    const row = this.database.prepare(`
      SELECT w.*, u.must_change_password, 1 AS has_user_account
      FROM users u JOIN soldiers w ON w.military_number = u.military_number
      WHERE u.user_id = ?
    `).get(Number(userId));
    return row ? workerFromRow(row) : null;
  }

  changePassword(userId, currentPassword, newPasswordValue) {
    const newPassword = String(newPasswordValue ?? '');
    if (newPassword.length < 8) throw new Error('يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.');
    if (newPassword.length > 256) throw new Error('كلمة المرور طويلة جداً.');

    const row = this.database.prepare('SELECT password_hash FROM users WHERE user_id = ?').get(Number(userId));
    if (!row || !verifyPassword(String(currentPassword ?? ''), row.password_hash)) {
      throw new Error('كلمة المرور الحالية غير صحيحة.');
    }

    this.database.prepare(`
      UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ?
      WHERE user_id = ?
    `).run(makePasswordHash(newPassword), new Date().toISOString(), Number(userId));
  }

  getWorker(workerId) {
    const row = this.database.prepare(`
      SELECT w.*, (u.user_id IS NOT NULL) AS has_user_account,
        COALESCE(u.must_change_password, 0) AS must_change_password
      FROM soldiers w LEFT JOIN users u ON u.military_number = w.military_number
      WHERE w.military_number = ?
    `).get(text(workerId));
    return row ? workerFromRow(row) : null;
  }

  listWorkers({
    search = '',
    page = 1,
    pageSize = 50,
    accountAvailable = false,
    militaryNumber = '',
    fullName = '',
    company = '',
    subLocation = '',
    joinDateFrom = '',
    joinDateTo = '',
    dischargeDateFrom = '',
    dischargeDateTo = '',
    enlistmentDateFrom = '',
    enlistmentDateTo = '',
    governorate = '',
    religion = '',
  } = {}) {
    const normalizedPage = Math.max(1, Math.floor(Number(page) || 1));
    const normalizedSize = Math.min(100, Math.max(1, Math.floor(Number(pageSize) || 50)));
    const query = text(search);
    const filters = [];
    const parameters = [];
    if (query) {
      filters.push(`(
        w.military_number LIKE ? OR w.full_name LIKE ? OR w.rank LIKE ?
        OR w.national_id LIKE ? OR w.triple_number LIKE ? OR w.company LIKE ?
        OR w.sub_location LIKE ? OR w.join_date LIKE ? OR w.discharge_date LIKE ?
        OR w.enlistment_date LIKE ? OR w.governorate LIKE ? OR w.district LIKE ?
        OR w.religion LIKE ? OR w.training_center LIKE ? OR w.weapon LIKE ?
        OR w.phone LIKE ? OR w.monthly_status LIKE ? OR w.notes LIKE ?
      )`);
      parameters.push(...Array(18).fill(`%${query}%`));
    }
    if (text(militaryNumber)) {
      filters.push('w.military_number LIKE ?');
      parameters.push(`%${text(militaryNumber)}%`);
    }
    if (text(fullName)) {
      filters.push('w.full_name LIKE ?');
      parameters.push(`%${text(fullName)}%`);
    }
    for (const [column, value] of [
      ['w.company', company],
      ['w.sub_location', subLocation],
      ['w.governorate', governorate],
      ['w.religion', religion],
    ]) {
      if (text(value)) {
        filters.push(`${column} = ?`);
        parameters.push(text(value));
      }
    }
    for (const [column, operator, value] of [
      ['w.join_date', '>=', joinDateFrom],
      ['w.join_date', '<=', joinDateTo],
      ['w.discharge_date', '>=', dischargeDateFrom],
      ['w.discharge_date', '<=', dischargeDateTo],
      ['w.enlistment_date', '>=', enlistmentDateFrom],
      ['w.enlistment_date', '<=', enlistmentDateTo],
    ]) {
      if (text(value)) {
        filters.push(`${column} ${operator} ?`);
        parameters.push(text(value));
      }
    }
    if (accountAvailable) {
      filters.push('NOT EXISTS (SELECT 1 FROM users u WHERE u.military_number = w.military_number)');
    }
    const filter = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const total = this.database.prepare(`
      SELECT COUNT(*) AS count FROM soldiers w ${filter}
    `).get(...parameters).count;
    const rows = this.database.prepare(`
      SELECT w.*, (u.user_id IS NOT NULL) AS has_user_account,
        COALESCE(u.must_change_password, 0) AS must_change_password
      FROM soldiers w LEFT JOIN users u ON u.military_number = w.military_number
      ${filter}
      ORDER BY w.full_name COLLATE NOCASE, w.military_number
      LIMIT ? OFFSET ?
    `).all(...parameters, normalizedSize, (normalizedPage - 1) * normalizedSize);
    return { workers: rows.map(workerFromRow), total, page: normalizedPage, pageSize: normalizedSize };
  }

  saveWorker(input, originalMilitaryNumber = '') {
    const worker = normalizeWorker(input);
    const issue = validateWorker(worker);
    if (issue) throw new Error(issue);
    const now = new Date().toISOString();

    if (originalMilitaryNumber) {
      const result = this.database.prepare(`
        UPDATE soldiers SET
          military_number = ?, rank = ?, full_name = ?, company = ?, sub_location = ?,
          national_id = ?, triple_number = ?, join_date = ?, discharge_date = ?,
          enlistment_date = ?, governorate = ?, district = ?, religion = ?,
          training_center = ?, weapon = ?, base_sub_location = ?, updated_at = ?
        WHERE military_number = ?
      `).run(
        worker.militaryNumber, worker.rank, worker.fullName, worker.company, worker.subLocation,
        worker.nationalId, worker.tripleNumber, worker.joinDate, worker.dischargeDate,
        worker.enlistmentDate, worker.governorate, worker.district, worker.religion,
        worker.trainingCenter, worker.weapon, worker.subLocation, now, text(originalMilitaryNumber),
      );
      if (result.changes === 0) throw new Error('لم يتم العثور على العامل المطلوب.');
      this.database.prepare(`
        UPDATE person_history SET military_number = ?
        WHERE person_type = 'soldier' AND military_number = ?
      `).run(worker.militaryNumber, text(originalMilitaryNumber));
      return this.getWorker(worker.militaryNumber);
    }

    this.insertWorker(worker, now);
    return this.getWorker(worker.militaryNumber);
  }

  insertWorker(worker, now = new Date().toISOString()) {
    this.database.prepare(`
      INSERT INTO soldiers (
        military_number, rank, full_name, company, sub_location, base_sub_location,
        national_id, triple_number, join_date, discharge_date, enlistment_date,
        governorate, district, religion, training_center, weapon, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(military_number) DO UPDATE SET
        rank = excluded.rank,
        full_name = excluded.full_name,
        company = excluded.company,
        sub_location = CASE
          WHEN EXISTS (SELECT 1 FROM worker_transfers WHERE worker_id = excluded.military_number)
          THEN soldiers.sub_location ELSE excluded.sub_location END,
        base_sub_location = excluded.base_sub_location,
        national_id = excluded.national_id,
        discharge_date = excluded.discharge_date,
        triple_number = excluded.triple_number,
        join_date = excluded.join_date,
        enlistment_date = excluded.enlistment_date,
        governorate = excluded.governorate,
        district = excluded.district,
        religion = excluded.religion,
        training_center = excluded.training_center,
        weapon = excluded.weapon,
        updated_at = excluded.updated_at
    `).run(
      worker.militaryNumber, worker.rank, worker.fullName, worker.company, worker.subLocation,
      worker.subLocation, worker.nationalId, worker.tripleNumber, worker.joinDate,
      worker.dischargeDate, worker.enlistmentDate, worker.governorate, worker.district,
      worker.religion, worker.trainingCenter, worker.weapon, now, now,
    );
  }

  importWorkers(records) {
    if (!Array.isArray(records) || records.length > 100000) {
      throw new Error('ملف الاستيراد غير صالح أو يحتوي على عدد كبير جداً من الصفوف.');
    }
    const errors = [];
    let inserted = 0;
    let updated = 0;
    const seenMilitaryNumbers = new Set();
    const findWorker = this.database.prepare('SELECT 1 FROM soldiers WHERE military_number = ?');
    const latestTransfer = this.database.prepare(`
      SELECT to_location FROM worker_transfers
      WHERE worker_id = ? ORDER BY effective_date DESC, id DESC LIMIT 1
    `);
    const setCurrentLocation = this.database.prepare(
      'UPDATE soldiers SET sub_location = ? WHERE military_number = ?',
    );

    this.database.exec('BEGIN IMMEDIATE');
    try {
      records.forEach((record, index) => {
        const worker = normalizeWorker(record);
        const issue = validateWorker(worker);
        if (issue) {
          errors.push({ row: index + 2, militaryNumber: worker.militaryNumber, message: issue });
          return;
        }
        if (seenMilitaryNumbers.has(worker.militaryNumber)) {
          errors.push({
            row: index + 2,
            militaryNumber: worker.militaryNumber,
            message: 'الرقم العسكري مكرر داخل ملف Excel.',
          });
          return;
        }
        seenMilitaryNumbers.add(worker.militaryNumber);

        const exists = Boolean(findWorker.get(worker.militaryNumber));
        this.insertWorker(worker);
        const latest = latestTransfer.get(worker.militaryNumber);
        if (latest) setCurrentLocation.run(latest.to_location, worker.militaryNumber);
        if (exists) updated += 1;
        else inserted += 1;
      });
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }

    return { inserted, updated, failed: errors.length, errors: errors.slice(0, 100) };
  }

  listUsers() {
    const rows = this.database.prepare(`
      SELECT u.user_id, u.military_number, u.must_change_password,
        u.created_at AS user_created_at, u.updated_at AS user_updated_at, w.*
      FROM users u JOIN soldiers w ON w.military_number = u.military_number
      ORDER BY w.full_name COLLATE NOCASE, w.military_number
    `).all();
    return rows.map(row => ({
      userId: Number(row.user_id),
      militaryNumber: row.military_number,
      fullName: row.full_name,
      role: 'admin',
      mustChangePassword: Boolean(row.must_change_password),
      createdAt: row.user_created_at,
      updatedAt: row.user_updated_at,
    }));
  }

  createUser(workerIdValue, passwordValue) {
    const workerId = text(workerIdValue);
    if (!this.getWorker(workerId)) throw new Error('لم يتم العثور على المجند المطلوب.');
    if (this.database.prepare('SELECT 1 FROM users WHERE military_number = ?').get(workerId)) {
      throw new Error('لدى هذا المجند حساب دخول بالفعل.');
    }
    const password = String(passwordValue ?? '');
    if (password.length < 8 || password.length > 256) {
      throw new Error('يجب أن تتكون كلمة المرور المؤقتة من 8 إلى 256 حرفاً.');
    }
    const now = new Date().toISOString();
    const result = this.database.prepare(`
      INSERT INTO users (military_number, password_hash, must_change_password, created_at, updated_at)
      VALUES (?, ?, 1, ?, ?)
    `).run(workerId, makePasswordHash(password), now, now);
    return {
      userId: Number(result.lastInsertRowid),
      militaryNumber: workerId,
      fullName: this.getWorker(workerId).fullName,
      role: 'admin',
      mustChangePassword: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  resetUserPassword(workerIdValue, passwordValue) {
    const workerId = text(workerIdValue);
    const user = this.database.prepare('SELECT user_id FROM users WHERE military_number = ?').get(workerId);
    if (!user) throw new Error('لم يتم العثور على حساب المسؤول المطلوب.');
    const password = String(passwordValue ?? '');
    if (password.length < 8 || password.length > 256) {
      throw new Error('يجب أن تتكون كلمة المرور المؤقتة من 8 إلى 256 حرفاً.');
    }
    this.database.prepare(`
      UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = ?
      WHERE user_id = ?
    `).run(makePasswordHash(password), new Date().toISOString(), user.user_id);
  }

  deleteUser(workerIdValue) {
    const workerId = text(workerIdValue);
    const user = this.database.prepare('SELECT user_id FROM users WHERE military_number = ?').get(workerId);
    if (!user) throw new Error('لم يتم العثور على حساب المسؤول المطلوب.');
    const admins = this.database.prepare('SELECT COUNT(*) AS count FROM users').get().count;
    if (admins <= 1) throw new Error('يجب الإبقاء على حساب مسؤول واحد على الأقل.');
    this.database.prepare('DELETE FROM users WHERE user_id = ?').run(user.user_id);
  }

  listLeaves(workerId = '') {
    const filter = text(workerId);
    const rows = filter
      ? this.database.prepare(`
        SELECT l.*, w.full_name FROM worker_leaves l
        JOIN soldiers w ON w.military_number = l.worker_id
        WHERE l.worker_id = ? ORDER BY l.start_date DESC, l.id DESC
      `).all(filter)
      : this.database.prepare(`
        SELECT l.*, w.full_name FROM worker_leaves l
        JOIN soldiers w ON w.military_number = l.worker_id
        ORDER BY l.start_date DESC, l.id DESC LIMIT 1000
      `).all();
    return rows.map(row => ({
      id: Number(row.id),
      workerId: row.worker_id,
      fullName: row.full_name,
      leaveType: row.leave_type,
      startDate: row.start_date,
      endDate: row.end_date,
      duration: row.duration,
      notes: row.notes,
    }));
  }

  listPersonnelLeaves({ personType = '', company = '', fullName = '', militaryNumber = '' } = {}) {
    if (personType && !personTypes.has(personType)) throw new Error('نوع الفرد غير صالح.');
    const filters = [];
    const parameters = [];
    if (personType) {
      filters.push('person_type = ?');
      parameters.push(personType);
    }
    for (const [column, value] of [
      ['company', company],
      ['full_name', fullName],
      ['military_number', militaryNumber],
    ]) {
      const query = text(value);
      if (query) {
        filters.push(`${column} LIKE ?`);
        parameters.push(`%${query}%`);
      }
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rows = this.database.prepare(`
      SELECT * FROM (
        SELECT l.id, 'legacy' AS source, 'soldier' AS person_type, l.worker_id AS military_number,
          s.full_name, s.company, l.leave_type, l.start_date, l.end_date, l.duration, l.notes
        FROM worker_leaves l
        JOIN soldiers s ON s.military_number = l.worker_id
        UNION ALL
        SELECT h.id, 'history' AS source, h.person_type, h.military_number,
          p.full_name, p.company, h.title AS leave_type, h.event_date AS start_date,
          h.end_date, h.duration, h.notes
        FROM person_history h
        JOIN officers p ON h.person_type = 'officer' AND p.military_number = h.military_number
        WHERE h.history_type = 'leave'
        UNION ALL
        SELECT h.id, 'history' AS source, h.person_type, h.military_number,
          p.full_name, p.company, h.title AS leave_type, h.event_date AS start_date,
          h.end_date, h.duration, h.notes
        FROM person_history h
        JOIN non_commissioned_officers p ON h.person_type = 'nco' AND p.military_number = h.military_number
        WHERE h.history_type = 'leave'
        UNION ALL
        SELECT h.id, 'history' AS source, h.person_type, h.military_number,
          p.full_name, p.company, h.title AS leave_type, h.event_date AS start_date,
          h.end_date, h.duration, h.notes
        FROM person_history h
        JOIN soldiers p ON h.person_type = 'soldier' AND p.military_number = h.military_number
        WHERE h.history_type = 'leave'
      ) ${where}
      ORDER BY start_date DESC, id DESC
    `).all(...parameters);
    return rows.map(row => ({
      id: Number(row.id),
      source: row.source,
      personType: row.person_type,
      workerId: row.military_number,
      militaryNumber: row.military_number,
      fullName: row.full_name,
      company: row.company,
      leaveType: row.leave_type,
      startDate: row.start_date,
      endDate: row.end_date,
      duration: row.duration,
      notes: row.notes,
    }));
  }

  saveLeave(input) {
    const workerId = text(input.workerId);
    const leaveType = text(input.leaveType);
    const startDate = text(input.startDate);
    const endDate = text(input.endDate);
    const duration = text(input.duration);
    if (!this.getWorker(workerId)) throw new Error('الرقم العسكري غير موجود.');
    if (!leaveType || !startDate || !endDate || endDate < startDate) {
      throw new Error('أدخل نوع الإجازة وتاريخي البداية والنهاية بشكل صحيح.');
    }
    if (!this.database.prepare(`
      SELECT 1 FROM worker_basics WHERE category = 'leaveType' AND value = ?
    `).get(leaveType)) {
      throw new Error('نوع الإجازة غير معرّف في صفحة تعريف الاساسيات.');
    }
    if (duration.length > 100) throw new Error('يجب ألا تتجاوز المدة 100 حرف.');

    if (input.id) {
      const result = this.database.prepare(`
        UPDATE worker_leaves SET worker_id = ?, leave_type = ?, start_date = ?, end_date = ?, duration = ?, notes = ?
        WHERE id = ?
      `).run(workerId, leaveType, startDate, endDate, duration, text(input.notes), Number(input.id));
      if (result.changes === 0) throw new Error('لم يتم العثور على سجل الإجازة.');
      return;
    }
    this.database.prepare(`
      INSERT INTO worker_leaves (worker_id, leave_type, start_date, end_date, duration, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(workerId, leaveType, startDate, endDate, duration, text(input.notes), new Date().toISOString());
  }

  savePersonnelLeave(input) {
    const personType = text(input.personType);
    const militaryNumber = text(input.militaryNumber);
    const leaveType = text(input.leaveType);
    const startDate = text(input.startDate);
    const endDate = text(input.endDate);
    const duration = text(input.duration);
    const notes = text(input.notes);
    if (!personTypes.has(personType) || !militaryNumber) throw new Error('اختر نوع الفرد وأدخل الرقم العسكري.');
    if (!leaveType || !startDate || !endDate || endDate < startDate) {
      throw new Error('أدخل نوع الإجازة وتاريخي البداية والنهاية بشكل صحيح.');
    }
    if (!this.database.prepare(`
      SELECT 1 FROM worker_basics WHERE category = 'leaveType' AND value = ?
    `).get(leaveType)) {
      throw new Error('نوع الإجازة غير معرّف في صفحة تعريف الاساسيات.');
    }
    if (personType === 'soldier') {
      this.saveLeave({ workerId: militaryNumber, leaveType, startDate, endDate, duration, notes });
      return;
    }
    this.savePersonHistory({
      personType,
      militaryNumber,
      historyType: 'leave',
      eventDate: startDate,
      endDate,
      title: leaveType,
      duration,
      notes,
    });
  }

  deleteLeave(id) {
    return this.database.prepare('DELETE FROM worker_leaves WHERE id = ?').run(Number(id)).changes > 0;
  }

  deletePersonnelLeave(source, id) {
    if (source === 'legacy') return this.deleteLeave(id);
    if (source === 'history') {
      const historyId = Number(id);
      if (!Number.isSafeInteger(historyId) || historyId <= 0) throw new Error('رقم سجل الإجازة غير صالح.');
      return this.database.prepare(`
        DELETE FROM person_history WHERE id = ? AND history_type = 'leave'
      `).run(historyId).changes > 0;
    }
    throw new Error('مصدر سجل الإجازة غير صالح.');
  }

  listTransfers(workerId = '') {
    const filter = text(workerId);
    const rows = filter
      ? this.database.prepare(`
        SELECT t.*, w.full_name FROM worker_transfers t
        JOIN soldiers w ON w.military_number = t.worker_id
        WHERE t.worker_id = ? ORDER BY t.effective_date DESC, t.id DESC
      `).all(filter)
      : this.database.prepare(`
        SELECT t.*, w.full_name FROM worker_transfers t
        JOIN soldiers w ON w.military_number = t.worker_id
        ORDER BY t.effective_date DESC, t.id DESC LIMIT 1000
      `).all();
    return rows.map(row => ({
      id: Number(row.id),
      workerId: row.worker_id,
      fullName: row.full_name,
      effectiveDate: row.effective_date,
      fromLocation: row.from_location,
      toLocation: row.to_location,
      reason: row.reason,
      notes: row.notes,
    }));
  }

  saveTransfer(input) {
    const workerId = text(input.workerId);
    const effectiveDate = text(input.effectiveDate);
    const toLocation = text(input.toLocation);
    const worker = this.getWorker(workerId);
    if (!worker) throw new Error('الرقم العسكري غير موجود.');
    if (!effectiveDate || !toLocation) throw new Error('تاريخ النقل والموقع الجديد مطلوبان.');

    const fromLocation = text(input.fromLocation) || worker.subLocation;
    this.database.exec('BEGIN IMMEDIATE');
    try {
      this.database.prepare(`
        INSERT INTO worker_transfers (
          worker_id, effective_date, from_location, to_location, reason, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        workerId, effectiveDate, fromLocation, toLocation, text(input.reason), text(input.notes),
        new Date().toISOString(),
      );
      const currentTransfer = this.database.prepare(`
        SELECT to_location FROM worker_transfers
        WHERE worker_id = ? ORDER BY effective_date DESC, id DESC LIMIT 1
      `).get(workerId);
      this.database.prepare('UPDATE soldiers SET sub_location = ?, updated_at = ? WHERE military_number = ?')
        .run(currentTransfer.to_location, new Date().toISOString(), workerId);
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  deleteTransfer(id) {
    const transfer = this.database.prepare('SELECT worker_id FROM worker_transfers WHERE id = ?').get(Number(id));
    if (!transfer) return false;
    this.database.exec('BEGIN IMMEDIATE');
    try {
      this.database.prepare('DELETE FROM worker_transfers WHERE id = ?').run(Number(id));
      const latest = this.database.prepare(`
        SELECT to_location FROM worker_transfers
        WHERE worker_id = ? ORDER BY effective_date DESC, id DESC LIMIT 1
      `).get(transfer.worker_id);
      const worker = this.database.prepare('SELECT base_sub_location FROM soldiers WHERE military_number = ?')
        .get(transfer.worker_id);
      this.database.prepare('UPDATE soldiers SET sub_location = ?, updated_at = ? WHERE military_number = ?')
        .run(latest?.to_location ?? worker.base_sub_location, new Date().toISOString(), transfer.worker_id);
      this.database.exec('COMMIT');
      return true;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  listPersonHistory(personType, militaryNumber) {
    if (!personTypes.has(personType)) throw new Error('نوع السجل الشخصي غير صالح.');
    const workerId = text(militaryNumber);
    if (!workerId) throw new Error('الرقم العسكري مطلوب.');
    return this.database.prepare(`
      SELECT * FROM person_history
      WHERE person_type = ? AND military_number = ?
      ORDER BY event_date DESC, id DESC
    `).all(personType, workerId).map(row => ({
      id: Number(row.id),
      personType: row.person_type,
      militaryNumber: row.military_number,
      historyType: row.history_type,
      eventDate: row.event_date,
      endDate: row.end_date,
      title: row.title,
      duration: row.duration,
      reason: row.reason,
      fromLocation: row.from_location,
      toLocation: row.to_location,
      location: row.location,
      notes: row.notes,
      createdAt: row.created_at,
    }));
  }

  savePersonHistory(input) {
    const personType = text(input.personType);
    const militaryNumber = text(input.militaryNumber);
    const historyType = text(input.historyType);
    const eventDate = text(input.eventDate);
    const endDate = text(input.endDate);
    const title = text(input.title);
    const duration = text(input.duration);
    const reason = text(input.reason);
    const fromLocation = text(input.fromLocation);
    const toLocation = text(input.toLocation);
    const location = text(input.location);
    const notes = text(input.notes);
    if (!personTypes.has(personType) || !personHistoryTypes.has(historyType)) {
      throw new Error('نوع سجل التاريخ غير صالح.');
    }
    if (!militaryNumber || !this.database.prepare(
      `SELECT 1 FROM ${personTables[personType]} WHERE military_number = ?`,
    ).get(militaryNumber)) {
      throw new Error('لم يتم العثور على صاحب السجل.');
    }
    if (!isISODate(eventDate) || (endDate && !isISODate(endDate)) || (endDate && endDate < eventDate)) {
      throw new Error('أدخل تاريخ السجل وتاريخ الانتهاء بشكل صحيح.');
    }
    if (!title || title.length > 200 || duration.length > 100 || reason.length > 1000
      || fromLocation.length > 200 || toLocation.length > 200 || location.length > 200 || notes.length > 2000) {
      throw new Error('تحقق من الحقول المطلوبة وأطوال النصوص المدخلة.');
    }
    if (historyType === 'transfer' && (!fromLocation || !toLocation)) {
      throw new Error('الموقع السابق والموقع الجديد مطلوبان لسجل النقل.');
    }

    this.database.prepare(`
      INSERT INTO person_history (
        person_type, military_number, history_type, event_date, end_date, title, duration,
        reason, from_location, to_location, location, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      personType,
      militaryNumber,
      historyType,
      eventDate,
      endDate,
      title,
      duration,
      reason,
      fromLocation,
      toLocation,
      location,
      notes,
      new Date().toISOString(),
    );
  }

  deletePersonHistory(id) {
    const historyId = Number(id);
    if (!Number.isSafeInteger(historyId) || historyId <= 0) throw new Error('رقم سجل التاريخ غير صالح.');
    return this.database.prepare('DELETE FROM person_history WHERE id = ?').run(historyId).changes > 0;
  }

  exportBackupJSON() {
    return JSON.stringify({
      format: 'worker-manager-backup',
      version: 6,
      exportedAt: new Date().toISOString(),
      soldiers: this.database.prepare('SELECT * FROM soldiers ORDER BY military_number').all(),
      users: this.database.prepare(`
        SELECT military_number, password_hash, must_change_password, created_at, updated_at
        FROM users ORDER BY military_number
      `).all(),
      leaves: this.database.prepare('SELECT * FROM worker_leaves ORDER BY id').all(),
      transfers: this.database.prepare('SELECT * FROM worker_transfers ORDER BY id').all(),
      basics: this.database.prepare('SELECT category, value, company FROM worker_basics ORDER BY category, company, value').all(),
      officers: this.database.prepare('SELECT * FROM officers ORDER BY military_number').all(),
      nonCommissionedOfficers: this.database.prepare('SELECT * FROM non_commissioned_officers ORDER BY military_number').all(),
      personHistory: this.database.prepare('SELECT * FROM person_history ORDER BY id').all(),
    }, null, 2);
  }

  importBackupJSON(jsonContent) {
    let backup;
    try {
      backup = JSON.parse(jsonContent);
    } catch {
      throw new Error('ملف النسخة الاحتياطية ليس JSON صالحاً.');
    }
    if (!backup || backup.format !== 'worker-manager-backup'
      || ![1, 2, 3, 4, 5, 6].includes(backup.version) || !Array.isArray(backup.leaves)
      || !Array.isArray(backup.transfers)
      || (backup.version < 3 && !Array.isArray(backup.workers))
      || (backup.version >= 3 && (!Array.isArray(backup.soldiers) || !Array.isArray(backup.users)))
      || (backup.version === 2 && !Array.isArray(backup.users))
      || (backup.version >= 4 && !Array.isArray(backup.basics))
      || (backup.version >= 5 && (!Array.isArray(backup.officers)
        || !Array.isArray(backup.nonCommissionedOfficers)))
      || (backup.version >= 6 && !Array.isArray(backup.personHistory))) {
      throw new Error('تنسيق ملف النسخة الاحتياطية غير مدعوم.');
    }

    const soldiers = backup.version >= 3
      ? backup.soldiers
      : backup.workers.map(worker => ({
        military_number: worker.worker_id,
        rank: worker.degree,
        full_name: worker.full_name,
        company: worker.department,
        sub_location: worker.location,
        base_sub_location: worker.base_location ?? worker.location,
        national_id: worker.national_id,
        triple_number: '',
        join_date: worker.entry_date,
        discharge_date: worker.discharge_date,
        enlistment_date: worker.enlistment_date,
        governorate: '',
        district: '',
        religion: '',
        training_center: '',
        weapon: '',
        phone: worker.phone,
        monthly_status: worker.monthly_status,
        notes: worker.notes,
        created_at: worker.created_at,
        updated_at: worker.updated_at,
      }));
    const soldierIds = new Set();
    for (const soldier of soldiers) {
      if (!soldier || !text(soldier.military_number) || !text(soldier.full_name)) {
        throw new Error('تحتوي النسخة على بيانات مجند غير صالحة.');
      }
      if (soldierIds.has(soldier.military_number)) throw new Error('رقم عسكري مكرر في النسخة الاحتياطية.');
      soldierIds.add(soldier.military_number);
    }
    const users = backup.version === 1
      ? backup.workers.filter(worker => worker.is_admin).map(worker => ({
        military_number: worker.worker_id,
        password_hash: worker.password_hash,
        must_change_password: worker.must_change_password,
        created_at: worker.created_at,
        updated_at: worker.updated_at,
      }))
      : backup.version === 2
        ? backup.users.map(user => ({ ...user, military_number: user.worker_id }))
        : backup.users;
    const userMilitaryNumbers = new Set();
    for (const user of users) {
      if (!user || !soldierIds.has(user.military_number) || userMilitaryNumbers.has(user.military_number)) {
        throw new Error('تحتوي النسخة على حساب مستخدم مرتبط برقم عسكري غير صالح.');
      }
      if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/i.test(user.password_hash || '')) {
        throw new Error('تحتوي النسخة على كلمة مرور مشفرة غير صالحة.');
      }
      userMilitaryNumbers.add(user.military_number);
    }
    if (backup.version === 1 && users.length === 0) {
      throw new Error('يجب أن تحتوي النسخة القديمة على حساب مسؤول واحد على الأقل.');
    }
    for (const history of [...backup.leaves, ...backup.transfers]) {
      if (!history || !soldierIds.has(history.worker_id)) {
        throw new Error('تحتوي النسخة على سجل مرتبط برقم عسكري غير موجود.');
      }
    }
    let basics = [];
    if (backup.version >= 4) {
      const basicKeys = new Set();
      basics = backup.basics.map(item => {
        const category = text(item?.category);
        const value = text(item?.value);
        const company = text(item?.company);
        if (!workerBasicCategories.has(category) || !value || value.length > 200
          || (category === 'subLocation' ? !company : Boolean(company))) {
          throw new Error('تحتوي النسخة على تعريف أساسي غير صالح.');
        }
        const key = `${category}\u0000${value.toLocaleLowerCase()}\u0000${company.toLocaleLowerCase()}`;
        if (basicKeys.has(key)) throw new Error('تحتوي النسخة على تعريف أساسي مكرر.');
        basicKeys.add(key);
        return { category, value, company };
      });
      const companyNames = new Set(
        basics.filter(item => item.category === 'company').map(item => item.value.toLocaleLowerCase()),
      );
      if (basics.some(item => item.category === 'subLocation'
        && !companyNames.has(item.company.toLocaleLowerCase()))) {
        throw new Error('تحتوي النسخة على مكان فرعي مرتبط بسرية غير موجودة.');
      }
    }
    const normalizePersonnelBackup = (rows, gradeColumn) => {
      const personnelIds = new Set();
      return rows.map(row => {
      const militaryNumber = text(row?.military_number);
      const fullName = text(row?.full_name);
      const maleChildren = Number(row?.male_children ?? 0);
      const femaleChildren = Number(row?.female_children ?? 0);
      if (!militaryNumber || militaryNumber.length > 100 || !fullName || fullName.length > 200
        || !Number.isSafeInteger(maleChildren) || maleChildren < 0 || maleChildren > 10000
        || !Number.isSafeInteger(femaleChildren) || femaleChildren < 0 || femaleChildren > 10000
        || personnelIds.has(militaryNumber)) {
        throw new Error('تحتوي النسخة على بيانات ضابط أو ضابط صف غير صالحة.');
      }
      personnelIds.add(militaryNumber);
      return {
        military_number: militaryNumber,
        seniority_number: text(row?.seniority_number),
        grade: text(row?.[gradeColumn]),
        full_name: fullName,
        marital_status: text(row?.marital_status),
        male_children: maleChildren,
        female_children: femaleChildren,
        national_id: text(row?.national_id),
        company: text(row?.company),
        sub_location: text(row?.sub_location),
        created_at: row?.created_at || new Date().toISOString(),
        updated_at: row?.updated_at || new Date().toISOString(),
      };
      });
    };
    const officers = backup.version >= 5 ? normalizePersonnelBackup(backup.officers, 'rank') : [];
    const ncos = backup.version >= 5
      ? normalizePersonnelBackup(backup.nonCommissionedOfficers, 'degree')
      : [];
    const officerIds = new Set(officers.map(row => row.military_number));
    const ncoIds = new Set(ncos.map(row => row.military_number));
    const historyIds = new Set();
    const personHistory = (backup.version >= 6 ? backup.personHistory : []).map(row => {
      const personType = text(row?.person_type);
      const militaryNumber = text(row?.military_number);
      const historyType = text(row?.history_type);
      const eventDate = text(row?.event_date);
      const endDate = text(row?.end_date);
      const title = text(row?.title);
      const duration = text(row?.duration);
      const reason = text(row?.reason);
      const fromLocation = text(row?.from_location);
      const toLocation = text(row?.to_location);
      const location = text(row?.location);
      const notes = text(row?.notes);
      const personExists = personType === 'soldier'
        ? soldierIds.has(militaryNumber)
        : personType === 'officer'
          ? officerIds.has(militaryNumber)
          : personType === 'nco' && ncoIds.has(militaryNumber);
      const id = Number(row?.id);
      if (!personExists || !personHistoryTypes.has(historyType) || !isISODate(eventDate)
        || (endDate && (!isISODate(endDate) || endDate < eventDate)) || !title || title.length > 200
        || duration.length > 100 || reason.length > 1000 || fromLocation.length > 200
        || toLocation.length > 200 || location.length > 200 || notes.length > 2000
        || (historyType === 'transfer' && (!fromLocation || !toLocation))
        || !Number.isSafeInteger(id) || id <= 0 || historyIds.has(id)) {
        throw new Error('تحتوي النسخة على سجل تاريخ شخصي غير صالح.');
      }
      historyIds.add(id);
      return {
        id,
        person_type: personType,
        military_number: militaryNumber,
        history_type: historyType,
        event_date: eventDate,
        end_date: endDate,
        title,
        duration,
        reason,
        from_location: fromLocation,
        to_location: toLocation,
        location,
        notes,
        created_at: row?.created_at || new Date().toISOString(),
      };
    });

    this.database.exec('BEGIN IMMEDIATE');
    try {
      this.database.exec(`
        DELETE FROM worker_transfers;
        DELETE FROM worker_leaves;
        DELETE FROM person_history;
        DELETE FROM users;
        DELETE FROM soldiers;
        DELETE FROM officers;
        DELETE FROM non_commissioned_officers;
      `);
      if (backup.version >= 4) this.database.exec('DELETE FROM worker_basics;');
      const insertSoldier = this.database.prepare(`
        INSERT INTO soldiers (
          military_number, rank, full_name, company, sub_location, base_sub_location, national_id,
          triple_number, join_date, discharge_date, enlistment_date, governorate, district, religion,
          training_center, weapon, phone, monthly_status, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const row of soldiers) {
        insertSoldier.run(
          row.military_number, text(row.rank), row.full_name, text(row.company), text(row.sub_location),
          text(row.base_sub_location ?? row.sub_location), text(row.national_id), text(row.triple_number),
          text(row.join_date), text(row.discharge_date), text(row.enlistment_date), text(row.governorate),
          text(row.district), text(row.religion), text(row.training_center), text(row.weapon),
          text(row.phone), text(row.monthly_status), text(row.notes), row.created_at || new Date().toISOString(),
          row.updated_at || new Date().toISOString(),
        );
      }
      const insertUser = this.database.prepare(`
        INSERT INTO users (military_number, password_hash, must_change_password, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const user of users) {
        insertUser.run(
          user.military_number, user.password_hash, Number(Boolean(user.must_change_password)),
          user.created_at || new Date().toISOString(),
          user.updated_at || new Date().toISOString(),
        );
      }
      const insertLeave = this.database.prepare(`
        INSERT INTO worker_leaves (id, worker_id, leave_type, start_date, end_date, duration, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const row of backup.leaves) {
        insertLeave.run(
          Number(row.id), row.worker_id, text(row.leave_type), text(row.start_date), text(row.end_date),
          text(row.duration), text(row.notes), row.created_at || new Date().toISOString(),
        );
      }
      const insertTransfer = this.database.prepare(`
        INSERT INTO worker_transfers (
          id, worker_id, effective_date, from_location, to_location, reason, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const row of backup.transfers) {
        insertTransfer.run(
          Number(row.id), row.worker_id, text(row.effective_date), text(row.from_location),
          text(row.to_location), text(row.reason), text(row.notes), row.created_at || new Date().toISOString(),
        );
      }
      const insertHistory = this.database.prepare(`
        INSERT INTO person_history (
          id, person_type, military_number, history_type, event_date, end_date, title, duration,
          reason, from_location, to_location, location, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const row of personHistory) {
        insertHistory.run(
          row.id, row.person_type, row.military_number, row.history_type, row.event_date, row.end_date,
          row.title, row.duration, row.reason, row.from_location, row.to_location, row.location,
          row.notes, row.created_at,
        );
      }
      const insertPersonnel = (table, gradeColumn, records) => {
        const insert = this.database.prepare(`
          INSERT INTO ${table} (
            military_number, seniority_number, ${gradeColumn}, full_name, marital_status,
            male_children, female_children, national_id, company, sub_location, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const row of records) {
          insert.run(
            row.military_number, row.seniority_number, row.grade, row.full_name, row.marital_status,
            row.male_children, row.female_children, row.national_id, row.company, row.sub_location,
            row.created_at, row.updated_at,
          );
        }
      };
      insertPersonnel('officers', 'rank', officers);
      insertPersonnel('non_commissioned_officers', 'degree', ncos);
      if (backup.version >= 4) {
        const insertBasic = this.database.prepare(`
          INSERT INTO worker_basics (category, value, company) VALUES (?, ?, ?)
        `);
        for (const item of basics) {
          insertBasic.run(item.category, item.value, item.company);
        }
      }
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
    if (backup.version < 4) this.seedWorkerBasics();
    return {
      soldiers: soldiers.length,
      users: users.length,
      leaves: backup.leaves.length,
      transfers: backup.transfers.length,
      officers: officers.length,
      nonCommissionedOfficers: ncos.length,
      historyRecords: personHistory.length,
    };
  }
}
