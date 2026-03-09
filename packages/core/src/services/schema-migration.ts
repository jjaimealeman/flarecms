/**
 * Schema Migration Service
 *
 * Records, describes, and retrieves schema evolution history for collections.
 * Foundation for Phase 9: Schema Migrations UI.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface SchemaChange {
  type: 'add_field' | 'modify_field' | 'remove_field'
  fieldName: string
  fieldLabel?: string
  fieldType?: string
  previousConfig?: Record<string, any>
  newConfig?: Record<string, any>
}

export interface SchemaMigration {
  id: string
  collectionId: string
  collectionName: string
  changes: SchemaChange[]
  description: string
  sqlExecuted: string | null
  status: 'applied' | 'failed' | 'rolled_back'
  previousSchema: string | null
  appliedBy: string | null
  appliedAt: number
  rolledBackAt: number | null
  rolledBackBy: string | null
}

// Reserved system fields that cannot be modified via schema migrations
const RESERVED_FIELDS = [
  'id',
  'slug',
  'title',
  'status',
  'created_at',
  'updated_at',
  'author_id',
  'collection_id',
] as const

// ── Service ──────────────────────────────────────────────────────────

export class SchemaMigrationService {
  private db: D1Database

  constructor(db: D1Database) {
    this.db = db
  }

  /**
   * Generate a human-readable description from a list of schema changes.
   *
   * Examples:
   *   - "Added 'tags' field to Blog Posts"
   *   - "Modified 'title' field in Blog Posts"
   *   - "Removed 'excerpt' field from Blog Posts"
   *   - "Added 'tags', modified 'title' in Blog Posts"
   */
  generateDescription(
    changes: SchemaChange[],
    collectionDisplayName: string,
  ): string {
    if (changes.length === 0) {
      return `No changes to ${collectionDisplayName}`
    }

    if (changes.length === 1) {
      const change = changes[0]!
      const label = change.fieldLabel || change.fieldName
      switch (change.type) {
        case 'add_field':
          return `Added '${label}' field to ${collectionDisplayName}`
        case 'modify_field':
          return `Modified '${label}' field in ${collectionDisplayName}`
        case 'remove_field':
          return `Removed '${label}' field from ${collectionDisplayName}`
      }
    }

    // Multiple changes -- group by type for a concise summary
    const parts: string[] = []
    const added = changes.filter((c) => c.type === 'add_field')
    const modified = changes.filter((c) => c.type === 'modify_field')
    const removed = changes.filter((c) => c.type === 'remove_field')

    if (added.length > 0) {
      const names = added.map((c) => `'${c.fieldLabel || c.fieldName}'`).join(', ')
      parts.push(`added ${names}`)
    }
    if (modified.length > 0) {
      const names = modified.map((c) => `'${c.fieldLabel || c.fieldName}'`).join(', ')
      parts.push(`modified ${names}`)
    }
    if (removed.length > 0) {
      const names = removed.map((c) => `'${c.fieldLabel || c.fieldName}'`).join(', ')
      parts.push(`removed ${names}`)
    }

    // Capitalize first part
    const summary = parts.join(', ')
    return `${summary.charAt(0).toUpperCase()}${summary.slice(1)} in ${collectionDisplayName}`
  }

  /**
   * Record a schema migration in the database.
   */
  async recordMigration(params: {
    collectionId: string
    collectionName: string
    changes: SchemaChange[]
    previousSchema: Record<string, any>
    userId: string | null
  }): Promise<SchemaMigration> {
    const id = crypto.randomUUID()
    const appliedAt = Date.now()
    const description = this.generateDescription(params.changes, params.collectionName)

    const migration: SchemaMigration = {
      id,
      collectionId: params.collectionId,
      collectionName: params.collectionName,
      changes: params.changes,
      description,
      sqlExecuted: null,
      status: 'applied',
      previousSchema: JSON.stringify(params.previousSchema),
      appliedBy: params.userId,
      appliedAt,
      rolledBackAt: null,
      rolledBackBy: null,
    }

    await this.db
      .prepare(
        `INSERT INTO schema_migrations
         (id, collection_id, collection_name, changes, description, sql_executed, status, previous_schema, applied_by, applied_at, rolled_back_at, rolled_back_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        migration.id,
        migration.collectionId,
        migration.collectionName,
        JSON.stringify(migration.changes),
        migration.description,
        migration.sqlExecuted,
        migration.status,
        migration.previousSchema,
        migration.appliedBy,
        migration.appliedAt,
        migration.rolledBackAt,
        migration.rolledBackBy,
      )
      .run()

    return migration
  }

  /**
   * Get migration history, optionally filtered by collection.
   */
  async getMigrationHistory(params: {
    collectionId?: string
    limit?: number
    offset?: number
  }): Promise<{ migrations: SchemaMigration[]; total: number }> {
    const limit = params.limit ?? 20
    const offset = params.offset ?? 0

    let countSql = 'SELECT COUNT(*) as total FROM schema_migrations'
    let dataSql =
      'SELECT * FROM schema_migrations'
    const bindings: any[] = []

    if (params.collectionId) {
      const whereClause = ' WHERE collection_id = ?'
      countSql += whereClause
      dataSql += whereClause
      bindings.push(params.collectionId)
    }

    dataSql += ' ORDER BY applied_at DESC LIMIT ? OFFSET ?'

    // Run count query
    const countResult = await this.db
      .prepare(countSql)
      .bind(...bindings)
      .first<{ total: number }>()
    const total = countResult?.total ?? 0

    // Run data query
    const dataResult = await this.db
      .prepare(dataSql)
      .bind(...bindings, limit, offset)
      .all()

    const migrations = (dataResult.results || []).map((row: any) =>
      this.rowToMigration(row),
    )

    return { migrations, total }
  }

  /**
   * Get the most recent migration for a collection.
   */
  async getLastMigration(
    collectionId: string,
  ): Promise<SchemaMigration | null> {
    const result = await this.db
      .prepare(
        'SELECT * FROM schema_migrations WHERE collection_id = ? ORDER BY applied_at DESC LIMIT 1',
      )
      .bind(collectionId)
      .first()

    if (!result) return null
    return this.rowToMigration(result)
  }

  /**
   * Update migration status (used for rollback).
   */
  async updateMigrationStatus(
    migrationId: string,
    status: 'rolled_back',
    userId: string | null,
  ): Promise<void> {
    await this.db
      .prepare(
        'UPDATE schema_migrations SET status = ?, rolled_back_at = ?, rolled_back_by = ? WHERE id = ?',
      )
      .bind(status, Date.now(), userId, migrationId)
      .run()
  }

  /**
   * Validate a field change before applying it.
   */
  static validateFieldChange(params: {
    managed: boolean
    fieldName: string
    existingFields: string[]
    changeType?: 'add_field' | 'modify_field' | 'remove_field'
  }): { valid: boolean; error?: string } {
    // Reject managed collections
    if (params.managed) {
      return {
        valid: false,
        error: 'Cannot modify fields on managed collections',
      }
    }

    // Reject reserved system fields
    if (
      (RESERVED_FIELDS as readonly string[]).includes(
        params.fieldName.toLowerCase(),
      )
    ) {
      return {
        valid: false,
        error: `'${params.fieldName}' is a reserved system field`,
      }
    }

    // For add operations: reject duplicate field names
    if (
      params.changeType === 'add_field' &&
      params.existingFields.includes(params.fieldName)
    ) {
      return {
        valid: false,
        error: `Field '${params.fieldName}' already exists`,
      }
    }

    return { valid: true }
  }

  // ── Private helpers ──────────────────────────────────────────────

  private rowToMigration(row: any): SchemaMigration {
    return {
      id: row.id,
      collectionId: row.collection_id,
      collectionName: row.collection_name,
      changes: JSON.parse(row.changes || '[]'),
      description: row.description,
      sqlExecuted: row.sql_executed ?? null,
      status: row.status,
      previousSchema: row.previous_schema ?? null,
      appliedBy: row.applied_by ?? null,
      appliedAt: row.applied_at,
      rolledBackAt: row.rolled_back_at ?? null,
      rolledBackBy: row.rolled_back_by ?? null,
    }
  }
}
