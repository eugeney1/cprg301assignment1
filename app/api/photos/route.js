import { NextResponse } from 'next/server';
import db from '../../../db';

export async function GET() {
  return new Promise((resolve) => {
    db.all('SELECT * FROM photos ORDER BY timestamp DESC', (err, rows) => {
      if (err) {
        console.error(err);
        return resolve(new NextResponse(JSON.stringify({ error: err.message }), { status: 500 }));
      }
      resolve(new NextResponse(JSON.stringify(rows), { status: 200 }));
    });
  });
}

export async function POST(request) {
  const { filename, filepath } = await request.json();
  return new Promise((resolve) => {
    db.run(
      'INSERT INTO photos (filename, filepath) VALUES (?, ?)',
      [filename, filepath],
      function (err) {
        if (err) {
          console.error(err);
          return resolve(new NextResponse(JSON.stringify({ error: err.message }), { status: 500 }));
        }
        resolve(new NextResponse(JSON.stringify({ id: this.lastID }), { status: 201 }));
      }
    );
  });
}

// NEW DELETE METHOD
export async function DELETE(request) {
  const { id } = await request.json();
  return new Promise((resolve) => {
    db.run('DELETE FROM photos WHERE id = ?', [id], function (err) {
      if (err) {
        console.error(err);
        return resolve(new NextResponse(JSON.stringify({ error: err.message }), { status: 500 }));
      }
      resolve(new NextResponse(JSON.stringify({ message: 'Photo deleted successfully' }), { status: 200 }));
    });
  });
}
