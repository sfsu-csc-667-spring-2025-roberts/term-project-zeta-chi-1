/** @type {import('node-pg-migrate').MigrationBuilder} */

exports.up = pgm => {
    pgm.createExtension('uuid-ossp', { ifNotExists: true });
  
    pgm.createTable('users', {
      id:           { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      email:        { type: 'text', unique: true, notNull: true },
      password_hash:{ type: 'text', notNull: true },
      created_at:   { type: 'timestamptz', default: pgm.func('now()') },
      wins
    });
  };
  
  exports.down = pgm => {
    pgm.dropTable('users');
    pgm.dropExtension('uuid-ossp', { ifExists: true });
  };
  