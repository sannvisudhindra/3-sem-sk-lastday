import express from 'express';
import { getSupabaseAdmin } from '../services/supabaseAdmin.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// GET /venues (PRD §7.3)
router.get('/', async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: venues, error } = await supabase
      .from('venues')
      .select(`
        id,
        name,
        city,
        venue_type,
        capacity,
        image_url,
        instructions,
        sections:venue_sections (
          id,
          name,
          color,
          capacity
        )
      `)
      .order('name');

    if (error) {
      throw new AppError('INTERNAL_ERROR', error.message);
    }

    const formatted = (venues || []).map((v) => ({
      id: v.id,
      name: v.name,
      city: v.city,
      venueType: v.venue_type,
      capacity: v.capacity,
      imageUrl: v.image_url,
      instructions: v.instructions,
      sections: v.sections || [],
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// GET /venues/:id (PRD §7.3)
router.get('/:id', async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: venue, error } = await supabase
      .from('venues')
      .select(`
        id,
        name,
        city,
        venue_type,
        capacity,
        layout,
        image_url,
        instructions,
        sections:venue_sections (
          id,
          name,
          color,
          capacity
        )
      `)
      .eq('id', req.params.id)
      .maybeSingle();

    if (error || !venue) {
      throw new AppError('NOT_FOUND', 'Venue not found');
    }

    // Also get seat count for venue
    const { count: seatCount } = await supabase
      .from('venue_seats')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venue.id);

    res.json({
      id: venue.id,
      name: venue.name,
      city: venue.city,
      venueType: venue.venue_type,
      capacity: venue.capacity,
      layout: venue.layout,
      imageUrl: venue.image_url,
      instructions: venue.instructions,
      sections: venue.sections || [],
      seatCount: seatCount || 0,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

