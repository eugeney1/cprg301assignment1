// pages/api/photos/toggle-visibility.js
export default async function handler(req, res) {
    if (req.method === 'POST') {
      const { id, isPublic } = req.body;
  
      // Update visibility in your DB (this is just a mockup)
      // Example: await db.photos.update({ where: { id }, data: { isPublic } });
  
      return res.status(200).json({ success: true });
    }
  
    res.status(405).json({ message: 'Method not allowed' });
  }
  