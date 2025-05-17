/** @type {import('node-pg-migrate').MigrationBuilder} */

exports.up = pgm => {
    // add columns with default 0 so existing rows get 0 automatically
    pgm.addColumns('users', {
      wins:    { type: 'integer', notNull: true, default: 0 },
      losses:  { type: 'integer', notNull: true, default: 0 },
    });
  };
  
  exports.down = pgm => {
    pgm.dropColumns('users', ['wins', 'losses']);
  };
  