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
   * Rollback the most recent migration for a collection.
   *
   * Validates that the migration is the latest applied one, then atomically
   * restores the previous schema and records a rollback audit entry.
   */
  async rollbackMigration(
    migrationId: string,
    userId: string | null,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Fetch the migration by ID
      const migration = await this.db
        .prepare('SELECT * FROM schema_migrations WHERE id = ?')
        .bind(migrationId)
        .first()

      if (!migration) {
        return { success: false, error: 'Migration not found' }
      }

      const migrationData = this.rowToMigration(migration)

      // Must be 'applied' status
      if (migrationData.status !== 'applied') {
        return {
          success: false,
          error: `Cannot rollback migration with status '${migrationData.status}'`,
        }
      }

      // Must be the most recent applied migration for this collection
      const latestApplied = await this.db
        .prepare(
          'SELECT id FROM schema_migrations WHERE collection_id = ? AND status = \'applied\' ORDER BY applied_at DESC LIMIT 1',
        )
        .bind(migrationData.collectionId)
        .first<{ id: string }>()

      if (!latestApplied || latestApplied.id !== migrationId) {
        return {
          success: false,
          error: 'Can only rollback the most recent migration',
        }
      }

      // Must have a previous schema to restore
      if (!migrationData.previousSchema) {
        return {
          success: false,
          error: 'No previous schema available for rollback',
        }
      }

      // Fetch the current collection schema (to record in the rollback audit entry)
      const collection = await this.db
        .prepare('SELECT schema, display_name, name FROM collections WHERE id = ?')
        .bind(migrationData.collectionId)
        .first<{ schema: string; display_name: string; name: string }>()

      if (!collection) {
        return { success: false, error: 'Collection not found' }
      }

      const now = Date.now()
      const rollbackAuditId = crypto.randomUUID()
      const currentSchema = collection.schema || '{}'

      // Atomically: restore schema, update migration status, record rollback audit
      await this.db.batch([
        // 1. Restore the collection's schema to the previous version
        this.db
          .prepare('UPDATE collections SET schema = ?, updated_at = ? WHERE id = ?')
          .bind(migrationData.previousSchema, now, migrationData.collectionId),

        // 2. Mark the migration as rolled back
        this.db
          .prepare(
            'UPDATE schema_migrations SET status = ?, rolled_back_at = ?, rolled_back_by = ? WHERE id = ?',
          )
          .bind('rolled_back', now, userId, migrationId),

        // 3. Record a rollback audit entry (so the rollback itself is traceable)
        this.db
          .prepare(
            `INSERT INTO schema_migrations
             (id, collection_id, collection_name, changes, description, sql_executed, status, previous_schema, applied_by, applied_at, rolled_back_at, rolled_back_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            rollbackAuditId,
            migrationData.collectionId,
            migrationData.collectionName,
            JSON.stringify(migrationData.changes.map((c) => ({
              ...c,
              type: c.type === 'add_field'
                ? 'remove_field'
                : c.type === 'remove_field'
                  ? 'add_field'
                  : c.type,
            }))),
            `Rollback: ${migrationData.description}`,
            null,
            'applied',
            currentSchema, // capture schema before rollback
            userId,
            now,
            null,
            null,
          ),
      ])

      return { success: true }
    } catch (error) {
      console.error('[SchemaMigrationService] Rollback failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during rollback',
      }
    }
  }

  /**
   * Get the IDs of the most recent applied migration per collection.
   * Used by the UI to determine which migrations can be rolled back.
   */
  async getLatestAppliedPerCollection(): Promise<Set<string>> {
    const result = await this.db
      .prepare(
        `SELECT id FROM schema_migrations
         WHERE status = 'applied'
         AND applied_at = (
           SELECT MAX(sm2.applied_at) FROM schema_migrations sm2
           WHERE sm2.collection_id = schema_migrations.collection_id
           AND sm2.status = 'applied'
         )`,
      )
      .all()

    return new Set((result.results || []).map((row: any) => String(row.id)))
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
