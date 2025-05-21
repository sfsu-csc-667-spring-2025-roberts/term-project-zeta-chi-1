/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.shorthands = undefined;

exports.up = (pgm) => {
    // These columns already exist manually — this keeps migration history aligned
    pgm.addColumns('users', {
        first_name:   { type: 'text', notNull: true },
        last_name:    { type: 'text', notNull: true },
        avatar_data:  { type: 'jsonb' },
        losses:       { type: 'integer', default: 0 },
    });
};

exports.down = (pgm) => {
    pgm.dropColumns('users', ['first_name', 'last_name', 'avatar_data', 'losses']);
};
