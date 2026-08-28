import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const exercises = [
  {
    name: "Neck Side Bends",
    instructions: "Place your hand on the side of your head and gently press your head into your hand without moving it, holding for 5-10 seconds to activate stabilizing muscles."
  },
  {
    name: "Upper Trapezius Stretch",
    instructions: "Gently tilt your ear toward your shoulder until a stretch is felt on the opposite side, keeping the opposite shoulder relaxed and down."
  },
  {
    name: "Suboccipital Release (Self-Massage)",
    instructions: "Using two tennis balls in a sock, lie down with the balls placed at the base of the skull where it meets the neck, allowing gravity to apply pressure for 2 minutes."
  },
  {
    name: "Chin Tucks",
    instructions: "Tuck your chin straight back as if creating a \"double chin\" to elongate the back of the neck and activate the deep cervical flexors."
  },
  {
    name: "Scapular Squeezes",
    instructions: "Sit upright and pull your shoulder blades together and down, imagining you are trying to squeeze a pencil between them to counteract slouching."
  },
  {
    name: "Levator Scapulae Stretch",
    instructions: "Look down into your armpit and gently pull your head forward with your hand until you feel a stretch along the back and side of the neck."
  },
  {
    name: "Shoulder Shrugs (Controlled)",
    instructions: "Lift shoulders toward ears and slowly lower them down to their maximum range to encourage blood flow to the spastic muscle."
  },
  {
    name: "Pectoralis Doorway Stretch",
    instructions: "Place forearms on a door frame and lean forward to open up the chest, which is often tight in forward head posture cases."
  },
  {
    name: "Neck Range of Motion",
    instructions: "Slowly turn your head to one side until you feel a gentle stretch, hold for 2 seconds, and repeat on the other side to maintain joint mobility."
  },
  {
    name: "Isometric Neck Extension",
    instructions: "Place hands behind the head and gently press the head backward into the hands without allowing movement, strengthening the posterior stabilizers."
  },
  {
    name: "Nerve Glides (Median Nerve)",
    instructions: "Extend the arm out to the side with the palm facing up, then gently tilt the head away while extending the wrist to \"floss\" the nerve through the cervical outlet."
  },
  {
    name: "Pendulum Exercise",
    instructions: "Lean over a table, supporting yourself with the healthy arm, and let the injured arm hang down, gently swinging it in small circles to maintain joint space."
  },
  {
    name: "External Rotation with Resistance Band",
    instructions: "Keep your elbow tucked into your side at 90 degrees and rotate your hand away from your body against the resistance of a light band."
  },
  {
    name: "Finger Ladder / Wall Crawl",
    instructions: "Face a wall and \"walk\" your fingers up as high as possible, holding the peak stretch for 5 seconds to gradually increase elevation range."
  },
  {
    name: "Towel Stretch (Internal Rotation)",
    instructions: "Hold a towel behind your back with both hands and use the top hand to gently pull the lower hand upward, stretching the internal rotators."
  },
  {
    name: "Scapular Wall Slides",
    instructions: "Stand with your back and arms against a wall in a \"goal post\" position, then slowly slide your arms up and down without losing wall contact."
  },
  {
    name: "Internal Rotation Stretch (Sleeper Stretch)",
    instructions: "Lie on your affected side with the shoulder at 90 degrees, then use your other hand to gently push the forearm down toward the floor."
  },
  {
    name: "I-Y-W-T Exercises",
    instructions: "Lying face down, lift your arms into the shapes of the letters Y, W, and T to strengthen the mid-trapezius and rhomboids."
  },
  {
    name: "Cross-Body Stretch",
    instructions: "Pull your arm across your chest and hold to stretch the posterior capsule, which often becomes tight when compressed during side-sleeping."
  },
  {
    name: "Isometric Abduction",
    instructions: "Standing next to a wall, press the back of your wrist into the wall as if trying to lift your arm out to the side, engaging the deltoid without joint movement."
  },
  {
    name: "Seated thoracic expansion",
    instructions: "Sit tall near the chair's front edge, clasp hands behind your head. Gently arch your upper back over the chair, opening your chest and tilting your head back. Hold 15-20 seconds, breathing normally, then release slowly. Repeat 2-3 times."
  },
  {
    name: "Thoracic Extension on Foam Roller",
    instructions: "Lie with a foam roller across your mid-back and gently lean backward over it to reverse the forward curve of the spine."
  },
  {
    name: "Cat-Cow Stretch",
    instructions: "On all fours, alternate between arching your back toward the ceiling (Cat) and dropping your belly toward the floor (Cow) to mobilize the vertebrae."
  },
  {
    name: "Back scratch stretch",
    instructions: "Reach one arm over your shoulder and down your back, and the other arm behind your lower back reaching up. Try to hook or touch your fingers together between your shoulder blades. Hold 15-20 seconds, then switch arm positions and repeat. Do 2-3 times per side."
  },
  {
    name: "Thoracic Rotation (Open Book)",
    instructions: "Lie on your side with knees bent, then rotate your top arm across your body to touch the floor behind you, opening the chest and mid-back."
  },
  {
    name: "Cobra Pose (Prone on Elbow)",
    instructions: "Lie face down with legs extended, palms flat on the floor under your shoulders. Press through your palms to slowly lift your chest, keeping hips and thighs grounded. Hold 15-20 seconds, keeping shoulders relaxed away from your ears. Slowly lower back down and repeat 2-3 times."
  },
  {
    name: "Pelvic Tilts",
    instructions: "Lie on your back with knees bent and gently flatten your lower back against the floor by tilting your pelvis upward."
  },
  {
    name: "Knee-to-Chest",
    instructions: "Lie on your back and gently pull one or both knees toward your chest to stretch the lower lumbar region."
  },
  {
    name: "Sciatic Nerve Flossing",
    instructions: "Sit on a chair, slump forward, and alternate between straightening your knee and pointing your toes to move the nerve through the tissues."
  },
  {
    name: "Piriformis Stretch",
    instructions: "Cross one leg over the other while lying down or sitting to release the piriformis muscle, which can compress the sciatic nerve."
  }
];

async function seed() {
  for (const ex of exercises) {
    const { data, error } = await supabase.from('exercises').insert([ex]);
    if (error) {
      console.error('Error inserting', ex.name, error);
    } else {
      console.log('Inserted', ex.name);
    }
  }
  console.log('Done!');
}
seed();
