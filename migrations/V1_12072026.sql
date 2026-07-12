    CREATE TABLE IF NOT EXISTS contractors (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      specialty TEXT NOT NULL,
      city TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )

    INSERT INTO contractors (name, specialty, city)
    SELECT *
    FROM (
      VALUES
        ('Ana Torres', 'Electricidad', 'Monterrey'),
        ('Luis Martinez', 'Plomeria', 'Guadalupe'),
        ('Marta Ruiz', 'Remodelacion', 'San Pedro')
    )