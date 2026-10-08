const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Event = require('./models/Event');
const Registration = require('./models/Registration');

const seedData = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Seed] Connected to database.');

    // Clear existing data
    console.log('[Seed] Clearing existing Users, Events, and Registrations...');
    await User.deleteMany();
    await Event.deleteMany();
    await Registration.deleteMany();

    // 1. Create Sample Organizer
    console.log('[Seed] Creating sample organizer...');
    const organizer = await User.create({
      name: 'Elena Rostova (Organizer)',
      email: 'organizer@eventhub.com',
      password: 'organizer123',
      role: 'organizer'
    });

    // 2. Create Sample Attendee User
    console.log('[Seed] Creating sample attendee user...');
    const attendee = await User.create({
      name: 'Alex Mercer (Attendee)',
      email: 'alex.mercer@example.com',
      password: 'user123',
      role: 'user'
    });

    // 3. Create 3 Sample Events with future dates
    console.log('[Seed] Creating 3 sample events...');
    const date1 = new Date();
    date1.setDate(date1.getDate() + 30); // 30 days from now

    const date2 = new Date();
    date2.setDate(date2.getDate() + 45); // 45 days from now

    const date3 = new Date();
    date3.setDate(date3.getDate() + 60); // 60 days from now

    const events = await Event.create([
      {
        title: 'Global AI & NextGen Cloud Summit 2026',
        description:
          'Explore the bleeding edge of AI agents, autonomous LLM architectures, distributed databases, and hyperscale cloud deployment systems with industry leaders.',
        date: date1,
        time: '09:00 AM',
        location: 'Moscone Center West, San Francisco, CA & Online',
        capacity: 150,
        createdBy: organizer._id
      },
      {
        title: 'FullStack Node.js & Microservices Masterclass',
        description:
          'An intensive hands-on workshop covering Node.js performance tuning, event loop optimization, Redis caching, and building fault-tolerant microservices.',
        date: date2,
        time: '11:00 AM',
        location: 'TechHub Innovation Lab, Seattle, WA',
        capacity: 35,
        createdBy: organizer._id
      },
      {
        title: 'Open Source Hackathon & Demo Gala',
        description:
          'Join 300+ developers, designers, and creators for an electrifying 48-hour buildathon featuring mentorship, cash prizes, and live project showcases.',
        date: date3,
        time: '10:00 AM',
        location: 'Metropolitan Pavilion, New York, NY',
        capacity: 200,
        createdBy: organizer._id
      }
    ]);

    // 4. Create 1 sample registration (Alex registers for Event 1)
    console.log('[Seed] Creating 1 sample registration...');
    const sampleRegistration = await Registration.create({
      user: attendee._id,
      event: events[0]._id,
      status: 'registered',
      registeredAt: new Date()
    });

    console.log('\n======================================================');
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('\nSample Accounts Created:');
    console.log('  1. Organizer:');
    console.log('     Email:    organizer@eventhub.com');
    console.log('     Password: organizer123');
    console.log('     Role:     organizer');
    console.log('     ID:      ', organizer._id.toString());
    console.log('\n  2. Regular Attendee:');
    console.log('     Email:    alex.mercer@example.com');
    console.log('     Password: user123');
    console.log('     Role:     user');
    console.log('     ID:      ', attendee._id.toString());
    console.log('\nSample Events Created:');
    events.forEach((ev, idx) => {
      console.log(`  [${idx + 1}] ID: ${ev._id}`);
      console.log(`      Title:    ${ev.title}`);
      console.log(`      Capacity: ${ev.capacity}`);
      console.log(`      Date:     ${ev.date.toISOString().split('T')[0]} at ${ev.time}`);
      console.log(`      Location: ${ev.location}`);
    });
    console.log('\nSample Registration Created:');
    console.log(`  ID: ${sampleRegistration._id} for Alex Mercer in "${events[0].title}"`);
    console.log('======================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error] Failed to seed database:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedData();
