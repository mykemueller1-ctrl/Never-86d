import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap, ChevronRight, ChevronLeft, CheckCircle2,
  XCircle, RotateCcw, Trophy, BookOpen, Monitor, CreditCard,
  Phone, UtensilsCrossed, Beer, ShoppingCart, Clock, AlertTriangle
} from "lucide-react";

// ============ POS TRAINING MODULE DATA ============
// Based on actual CTap operations from SOP documents

interface TrainingStep {
  id: string;
  title: string;
  instruction: string;
  hint?: string;
  expectedAction: string;
  correctFeedback: string;
  incorrectFeedback: string;
  choices?: { text: string; correct: boolean }[];
}

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  steps: TrainingStep[];
  requiredFor: string[];
}

const TRAINING_MODULES: TrainingModule[] = [
  {
    id: "phone-orders",
    title: "Taking Phone Orders",
    description: "Learn to take accurate phone orders — the #1 skill for new staff. Covers pizza customization, specials, and payment.",
    icon: <Phone className="w-5 h-5" />,
    difficulty: "beginner",
    estimatedMinutes: 15,
    requiredFor: ["Phone Taker", "Server", "Driver"],
    steps: [
      {
        id: "phone-1",
        title: "Answer the Phone",
        instruction: "The phone rings. How do you answer it at Community Tap?",
        hint: "Use the standard greeting with the restaurant name",
        expectedAction: "greeting",
        choices: [
          { text: "'Hello, what can I get you?'", correct: false },
          { text: "'Thank you for calling Community Tap & Pizzeria, this is [name], how can I help you?'", correct: true },
          { text: "'Community Tap, hold please.'", correct: false },
          { text: "'Yeah, what do you need?'", correct: false },
        ],
        correctFeedback: "Perfect! 'Thank you for calling Community Tap & Pizzeria, this is [name], how can I help you?' — Always include the restaurant name and your name.",
        incorrectFeedback: "Remember: Always say 'Thank you for calling Community Tap & Pizzeria, this is [your name], how can I help you?' Never just say 'Hello'.",
      },
      {
        id: "phone-2",
        title: "Take the Order",
        instruction: "Customer says: 'I'd like a large meat lovers pizza.' What information do you need to get from them?",
        hint: "Think about all the details needed to complete the order",
        expectedAction: "order-details",
        choices: [
          { text: "Just their name and address", correct: false },
          { text: "Pickup or delivery, name, phone, address (if delivery), modifications, anything else to add", correct: true },
          { text: "Their credit card number for payment", correct: false },
          { text: "Just ask if they want anything else", correct: false },
        ],
        correctFeedback: "Great! You need: pickup or delivery, their name, phone number, and if delivery — their address. Also ask about any modifications and if they want anything else.",
        incorrectFeedback: "You need to get: 1) Pickup or delivery 2) Name 3) Phone number 4) Address (if delivery) 5) Any modifications 6) Anything else to add. Don't forget any of these!",
      },
      {
        id: "phone-3",
        title: "Upsell Opportunity",
        instruction: "The customer ordered a large pizza. What's the standard upsell you should offer?",
        hint: "Think about common add-ons that pair with pizza",
        expectedAction: "upsell",
        choices: [
          { text: "A second pizza at full price", correct: false },
          { text: "Cheeseballs, garlic cheese bread, or a drink", correct: true },
          { text: "Nothing — just take the order as-is", correct: false },
          { text: "Ask if they want to upgrade to extra-large", correct: false },
        ],
        correctFeedback: "Excellent! Offer cheeseballs, garlic cheese bread, or a drink. 'Would you like to add some cheeseballs or garlic cheese bread with that?' — This is how we grow ticket averages.",
        incorrectFeedback: "Always offer an add-on! Cheeseballs and garlic cheese bread are the top sellers. A simple 'Would you like to add cheeseballs with that?' can increase the ticket by $6-8.",
      },
      {
        id: "phone-4",
        title: "Read Back the Order",
        instruction: "Before hanging up, what's the critical final step?",
        hint: "Accuracy is everything in phone orders",
        expectedAction: "readback",
        choices: [
          { text: "Say 'thanks, bye' and hang up", correct: false },
          { text: "Read back the full order: items, pickup/delivery, name, phone, total, and estimated time", correct: true },
          { text: "Just confirm the total amount", correct: false },
          { text: "Ask them to call back if there's a problem", correct: false },
        ],
        correctFeedback: "Always read the order back! 'So that's a large meat lovers for pickup under [name], phone [number]. Your total is $XX.XX and it'll be ready in about 20-25 minutes.' This prevents mistakes.",
        incorrectFeedback: "ALWAYS read the order back to the customer. This is the #1 way to prevent wrong orders. Include: items, pickup/delivery, name, phone, total, and estimated time.",
      },
      {
        id: "phone-5",
        title: "Estimated Time",
        instruction: "Customer asks 'How long will it take?' It's Friday at 6pm (dinner rush). What do you tell them?",
        hint: "Consider the day and time — rush hours affect wait times",
        expectedAction: "time-estimate",
        choices: [
          { text: "'About 15 minutes'", correct: false },
          { text: "'30-45 minutes for pickup, 45-60 for delivery'", correct: true },
          { text: "'I don't know, it depends'", correct: false },
          { text: "'An hour minimum'", correct: false },
        ],
        correctFeedback: "Friday dinner rush = 30-45 minutes for pickup, 45-60 for delivery. Always give the longer estimate so you can over-deliver. Never promise less than you can do.",
        incorrectFeedback: "During Friday dinner rush, say 30-45 minutes for pickup and 45-60 for delivery. It's better to over-estimate and surprise them early than to under-promise and disappoint.",
      },
    ],
  },
  {
    id: "bar-service",
    title: "Bar Service Basics",
    description: "Learn the bar workflow — drink orders, tab management, ID checking, and responsible service. Based on Ashley's bar training.",
    icon: <Beer className="w-5 h-5" />,
    difficulty: "intermediate",
    estimatedMinutes: 20,
    requiredFor: ["Bartender", "Bar Side Server"],
    steps: [
      {
        id: "bar-1",
        title: "ID Check",
        instruction: "A customer sits at the bar and orders a Busch Light. What's the first thing you do?",
        hint: "Iowa law requires checking IDs",
        expectedAction: "check-id",
        choices: [
          { text: "Grab a Busch Light and serve it", correct: false },
          { text: "Check their ID — photo, expiration, birth date", correct: true },
          { text: "Ask them if they're 21", correct: false },
          { text: "Only check if they look really young", correct: false },
        ],
        correctFeedback: "Check their ID! Iowa law: check everyone who looks under 35. Look at the photo, check the expiration date, and verify the birth date. No exceptions.",
        incorrectFeedback: "ALWAYS check ID first! Even if they look old enough. If they don't have ID, you cannot serve them alcohol. This protects you and the restaurant's liquor license.",
      },
      {
        id: "bar-2",
        title: "Domestic Beer Order",
        instruction: "Customer orders a 'Domestic Bucket of 6.' What does this include and what's the price?",
        hint: "This is our #1 selling beer item — $20.8K in revenue",
        expectedAction: "bucket-knowledge",
        choices: [
          { text: "6 craft beers in a bucket of ice", correct: false },
          { text: "6 domestic bottles (Bud Light, Busch Light, Coors Light, Miller Lite) in a bucket of ice — ring as one item", correct: true },
          { text: "6 individual domestic beers rung up separately", correct: false },
          { text: "A pitcher of domestic beer", correct: false },
        ],
        correctFeedback: "Domestic Bucket = 6 domestic bottles (Bud Light, Busch Light, Coors Light, Miller Lite, etc.) in a bucket of ice. It's our top beer seller. Know the current price and which domestics we carry.",
        incorrectFeedback: "A Domestic Bucket is 6 domestic bottles in ice. You need to know: which domestics we carry (Bud Light, Busch Light, Coors Light, Miller Lite), the current price, and how to ring it up as one item, not 6 individual beers.",
      },
      {
        id: "bar-3",
        title: "Mixed Drink Order",
        instruction: "Customer orders a Captain and Coke. Walk through the pour process.",
        hint: "Captain Morgan is our #1 liquor item — $5.5K in revenue",
        expectedAction: "pour-process",
        choices: [
          { text: "Free-pour Captain into a glass, add Coke", correct: false },
          { text: "Rocks glass → ice → 1.5oz Captain (jigger!) → Coke → lime wedge", correct: true },
          { text: "Pint glass → Coke first → pour Captain on top", correct: false },
          { text: "Shot glass of Captain with Coke on the side", correct: false },
        ],
        correctFeedback: "1) Grab a rocks glass 2) Fill with ice 3) Pour 1.5oz Captain Morgan (use the jigger!) 4) Fill with Coke 5) Garnish with a lime wedge. Always use the jigger — free-pouring costs money.",
        incorrectFeedback: "Standard pour: 1.5oz using the jigger. Never free-pour — it's inaccurate and costs the restaurant money. Ice first, then liquor, then mixer, then garnish. Captain and Coke gets a lime wedge.",
      },
      {
        id: "bar-4",
        title: "Tab Management",
        instruction: "Customer wants to open a tab. What do you need from them?",
        hint: "Protect the restaurant from walkouts",
        expectedAction: "open-tab",
        choices: [
          { text: "Just their name — trust them to pay later", correct: false },
          { text: "Their credit card (hold behind bar), enter name in POS. No cash tabs.", correct: true },
          { text: "Their phone number as collateral", correct: false },
          { text: "Nothing — just start adding drinks", correct: false },
        ],
        correctFeedback: "Get their credit card and keep it behind the bar. Enter their name in the POS and start the tab. If they want to pay cash, they pay as they go — no cash tabs. This prevents walkouts.",
        incorrectFeedback: "Always hold a credit card for tabs. Enter their name in the POS. No cash tabs — cash customers pay per round. This protects against walkouts which come directly out of the restaurant's bottom line.",
      },
      {
        id: "bar-5",
        title: "Cut-Off Decision",
        instruction: "A customer is slurring words and stumbling. They order another drink. What do you do?",
        hint: "Iowa dram shop law holds the server AND restaurant liable",
        expectedAction: "cut-off",
        choices: [
          { text: "Serve them one more — they're a regular", correct: false },
          { text: "Refuse service politely, offer water/food, get a manager, offer to call a ride", correct: true },
          { text: "Serve them a weaker drink", correct: false },
          { text: "Ignore them and hope they leave", correct: false },
        ],
        correctFeedback: "Refuse service politely but firmly. 'I appreciate your business but I can't serve you another drink tonight. Can I get you some water or food?' Offer to call a cab/ride. Tell a manager. Document it. Iowa law holds us liable if they drive and hurt someone.",
        incorrectFeedback: "You MUST cut them off. Say it politely but don't back down. Offer water and food. Get a manager involved. Offer to call a ride. This is a legal requirement — Iowa dram shop law makes the server AND restaurant liable for over-serving.",
      },
    ],
  },
  {
    id: "closing-procedures",
    title: "Closing Procedures",
    description: "End-of-night shutdown — kitchen close, bar close, cash handling, and security. The last person out is responsible for everything.",
    icon: <Clock className="w-5 h-5" />,
    difficulty: "intermediate",
    estimatedMinutes: 15,
    requiredFor: ["Kitchen Closer", "Bar Closer", "Manager"],
    steps: [
      {
        id: "close-1",
        title: "Kitchen Close Start",
        instruction: "It's 9:30pm and the kitchen closes at 10pm. What should you start doing NOW?",
        hint: "Don't wait until 10pm to start closing",
        expectedAction: "pre-close",
        choices: [
          { text: "Wait until 10pm, then start closing everything", correct: false },
          { text: "Start pre-closing: break down slow stations, clean fryers, wrap prep, date items", correct: true },
          { text: "Tell the kitchen to stop taking orders at 9:30", correct: false },
          { text: "Just clean your own station and leave", correct: false },
        ],
        correctFeedback: "Start pre-closing! Break down stations that aren't getting orders, start cleaning fryers, wrap and date prep items, clean the flat top edges. The goal is to be mostly done by 10pm so you can handle any last orders and finish quickly.",
        incorrectFeedback: "Pre-close starts 30 minutes before closing! If you wait until 10pm, you'll be there until midnight. Start breaking down slow stations, cleaning equipment, and wrapping prep. Handle last orders as they come in.",
      },
      {
        id: "close-2",
        title: "Fryer Shutdown",
        instruction: "Walk through the fryer closing procedure.",
        hint: "Safety first — hot oil is dangerous",
        expectedAction: "fryer-close",
        choices: [
          { text: "Drain the oil while it's still hot, then wipe down", correct: false },
          { text: "Turn off → let cool → filter oil → clean baskets → wipe exterior → check oil quality → log it", correct: true },
          { text: "Just turn them off and leave", correct: false },
          { text: "Leave the oil in and turn off — filter in the morning", correct: false },
        ],
        correctFeedback: "1) Turn off fryers 2) Let oil cool (NEVER move hot oil) 3) Filter oil through the filter machine 4) Clean fryer baskets and surrounding area 5) Wipe down the exterior 6) Check oil level and quality — if dark/foamy, flag for replacement. Log completion on the fryer checklist.",
        incorrectFeedback: "SAFETY FIRST: Turn off fryers and let oil cool before doing anything. Never move hot oil. Filter through the machine, clean baskets, wipe exterior, check oil quality. Log it on the fryer checklist — this is tracked.",
      },
      {
        id: "close-3",
        title: "Cash Handling",
        instruction: "You're counting the cash drawer at end of night. The POS says you should have $347.50 but you count $342.00. What do you do?",
        hint: "Honesty and documentation are critical",
        expectedAction: "cash-short",
        choices: [
          { text: "Write $347.50 on the report so it matches", correct: false },
          { text: "Document $342.00 (actual count), report the $5.50 shortage to the manager", correct: true },
          { text: "Add $5.50 from your own pocket to make it match", correct: false },
          { text: "Don't say anything and hope nobody notices", correct: false },
        ],
        correctFeedback: "Document the shortage ($5.50 short). Fill out the cash report honestly — write the actual count, not the expected amount. Tell the manager. Small shortages happen (making change, etc.) but they're tracked. Consistent shortages are a red flag.",
        incorrectFeedback: "NEVER adjust the count to match. Write the actual amount you counted. Report the $5.50 shortage to the manager. This is tracked over time — occasional small shortages are normal, but patterns are investigated.",
      },
      {
        id: "close-4",
        title: "Final Security Check",
        instruction: "You're the last person leaving. What's the security checklist?",
        hint: "You're responsible for the entire building",
        expectedAction: "security-check",
        choices: [
          { text: "Lock the front door and leave", correct: false },
          { text: "Equipment off, walk-in sealed, back door locked, lights off, alarm set, front door locked and checked", correct: true },
          { text: "Turn off the lights and set the alarm", correct: false },
          { text: "Just make sure the alarm is set", correct: false },
        ],
        correctFeedback: "1) All equipment off (ovens, fryers, flat top, warmers) 2) Walk-in and freezer doors sealed 3) Back door locked 4) All lights off except security lights 5) Alarm set 6) Front door locked and checked. You own this — if something's wrong tomorrow, it's on the closer.",
        incorrectFeedback: "The closer owns the building. Check: all cooking equipment off, walk-in/freezer sealed, back door locked, lights off (except security), alarm set, front door locked AND tested. Miss one step and you could cost the restaurant thousands.",
      },
    ],
  },
  {
    id: "void-procedures",
    title: "Void & Comp Procedures",
    description: "When and how to void items, apply comps, and handle mistakes. Understanding this prevents shrinkage and protects your job.",
    icon: <AlertTriangle className="w-5 h-5" />,
    difficulty: "advanced",
    estimatedMinutes: 10,
    requiredFor: ["Server", "Bartender", "Manager"],
    steps: [
      {
        id: "void-1",
        title: "Wrong Order Made",
        instruction: "You made a large meat lovers but the ticket says large taco pizza. The food is already made. What do you do?",
        hint: "Don't throw it away without documentation",
        expectedAction: "wrong-order",
        choices: [
          { text: "Throw away the wrong pizza and make the right one", correct: false },
          { text: "Make correct order, get manager to void wrong item, wrong pizza goes to mistake shelf", correct: true },
          { text: "Give the customer the meat lovers instead", correct: false },
          { text: "Void it yourself in the POS", correct: false },
        ],
        correctFeedback: "1) Make the correct order immediately 2) Get a manager to void the wrong item in the POS 3) The wrong pizza goes to the 'mistake shelf' — staff can eat it or it gets tossed at end of night. Every void is tracked and reviewed.",
        incorrectFeedback: "Get a manager to void it in the POS — you can't void your own items. Make the correct order ASAP. Don't just throw the wrong one away without documenting it. Every void shows up on the daily report and is reviewed.",
      },
      {
        id: "void-2",
        title: "Customer Complaint",
        instruction: "A customer says their pizza is cold. They want a new one. How do you handle this?",
        hint: "Customer satisfaction vs. cost control",
        expectedAction: "complaint-comp",
        choices: [
          { text: "Tell them it was hot when it left the kitchen", correct: false },
          { text: "Apologize, offer to remake, get manager to approve comp as 'Promo 100%' with reason note", correct: true },
          { text: "Offer them a free drink instead", correct: false },
          { text: "Void it yourself without telling a manager", correct: false },
        ],
        correctFeedback: "Apologize sincerely. Offer to remake it immediately. Get a manager to approve the comp. The original gets voided as 'Promo 100%' with a note about the reason. This is a legitimate comp — the goal is to keep the customer coming back.",
        incorrectFeedback: "Apologize, offer to remake, get manager approval. This is a legitimate comp — ring it as 'Promo 100%' with a note explaining why. Don't argue with the customer about whether it's really cold. The cost of losing a regular is way more than one pizza.",
      },
      {
        id: "void-3",
        title: "Employee Meals",
        instruction: "You're on a 6-hour shift and want to eat. What's the employee meal policy?",
        hint: "There are specific rules about what and when",
        expectedAction: "employee-meal",
        choices: [
          { text: "Just grab food whenever you're hungry", correct: false },
          { text: "Ring it up as 'Employee Meal' with your name BEFORE eating, within the dollar limit, eat on break", correct: true },
          { text: "Eat first, ring it up at end of shift", correct: false },
          { text: "Employee meals are free, no need to ring up", correct: false },
        ],
        correctFeedback: "Shifts 6+ hours get an employee meal. Ring it up in the POS as 'Employee Meal' with your name. There's a dollar limit — check with your manager. Eat during your break, not while working. It must be rung up BEFORE you eat, not after.",
        incorrectFeedback: "Employee meals must be rung up in the POS BEFORE you eat. Use the 'Employee Meal' button with your name. There's a dollar limit per shift. Eating without ringing it up is theft — even if you planned to ring it up later.",
      },
    ],
  },
  {
    id: "delivery-driver",
    title: "Delivery Driver Essentials",
    description: "Day 1 driver onboarding — paperwork, delivery workflow, cash handling, and safety. Based on the actual driver training SOP.",
    icon: <ShoppingCart className="w-5 h-5" />,
    difficulty: "beginner",
    estimatedMinutes: 12,
    requiredFor: ["Driver"],
    steps: [
      {
        id: "driver-1",
        title: "Pre-Delivery Check",
        instruction: "You have a delivery order ready. Before you leave the restaurant, what do you check?",
        hint: "Accuracy prevents costly re-deliveries",
        expectedAction: "pre-check",
        choices: [
          { text: "Just grab the bag and go — speed matters", correct: false },
          { text: "Verify items match ticket, check address/phone, grab napkins/sauces, have cash for change", correct: true },
          { text: "Check the address only", correct: false },
          { text: "Count the items but skip the address", correct: false },
        ],
        correctFeedback: "1) Verify the order matches the ticket — count every item 2) Check the address and phone number 3) Grab napkins, plates, and any sauces 4) Make sure you have enough cash for change if they're paying cash. One wrong delivery costs more than the order itself.",
        incorrectFeedback: "Check EVERYTHING before you leave: items match ticket, address is correct, phone number is there, napkins/plates/sauces included, cash for change if needed. A re-delivery costs gas, time, and a customer's patience.",
      },
      {
        id: "driver-2",
        title: "Cash Delivery",
        instruction: "The order is $23.50 and the customer hands you $30. Walk through the process.",
        hint: "Count change carefully and document everything",
        expectedAction: "cash-handling",
        choices: [
          { text: "Keep the $30 and figure it out later", correct: false },
          { text: "Give $6.50 change, document on slip, turn in $23.50 order amount at restaurant, keep tip", correct: true },
          { text: "Give $6.50 change and pocket the $23.50", correct: false },
          { text: "Tell them you don't have change", correct: false },
        ],
        correctFeedback: "Give back $6.50 in change. If they say 'keep the change,' that's your tip ($6.50). When you get back to the restaurant, turn in the $23.50 order amount. Your tip is yours. Document the cash amount on the delivery slip. Never pocket the order amount.",
        incorrectFeedback: "The order amount ($23.50) goes back to the restaurant. The change ($6.50) is the customer's unless they tip you. Document everything on the delivery slip. When you return, turn in the exact order amount. Discrepancies are tracked.",
      },
      {
        id: "driver-3",
        title: "End of Night Paperwork",
        instruction: "Your shift is over. You made 8 deliveries. What paperwork do you need to complete?",
        hint: "The nightly driver paperwork is required — no exceptions",
        expectedAction: "paperwork",
        choices: [
          { text: "Just turn in the cash and leave", correct: false },
          { text: "Fill out Nightly Driver Paperwork: every delivery (address, amount, type, tip), total cash, total tips, mileage", correct: true },
          { text: "Text the manager your totals", correct: false },
          { text: "Only fill out paperwork for cash deliveries", correct: false },
        ],
        correctFeedback: "Fill out the Nightly Driver Paperwork: list every delivery (address, amount, cash/card, tip), total cash collected, total tips, mileage. Turn in all cash. The manager reconciles your deliveries against the POS. Discrepancies are investigated.",
        incorrectFeedback: "Complete the Nightly Driver Paperwork for EVERY delivery: address, order amount, payment type, tip amount. Total your cash, total your tips, record mileage. Turn in all restaurant cash. This gets reconciled against the POS — it must match.",
      },
    ],
  },
];

// ─── Map POS training module IDs → real DB worker_training_modules IDs ───
const MODULE_DB_MAP: Record<string, number> = {
  "phone-orders": 4,       // "Phone Order Protocol"
  "bar-service": 16,       // "Drink Making & Bar Skills"
  "closing-procedures": 7, // "Closing Procedures — Pizza Side" (general closing)
  "void-procedures": 3,    // "POS/Computer Training — PDQ System" (voids are POS operations)
  "delivery-driver": 5,    // "Delivery Logistics & Driver Operations"
};

// ============ TRAINING SCREEN COMPONENT ============

interface POSTrainingScreenProps {
  staffId?: number;
  staffName?: string;
  onBack: () => void;
}

export default function POSTrainingScreen({ staffId, staffName, onBack }: POSTrainingScreenProps) {
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, "correct" | "incorrect" | null>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [moduleComplete, setModuleComplete] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);

  // Record training completion
  const recordCompletion = trpc.training.complete.useMutation();

  const handleAnswer = (choiceIndex: number) => {
    if (!selectedModule) return;
    const step = selectedModule.steps[currentStep];
    const isRight = step.choices ? step.choices[choiceIndex].correct : choiceIndex === 0;
    setSelectedChoice(choiceIndex);
    setIsCorrect(isRight);
    setShowFeedback(true);
    setAnswers(prev => ({ ...prev, [step.id]: isRight ? "correct" : "incorrect" }));
  };

  const handleNext = () => {
    if (!selectedModule) return;
    setShowFeedback(false);
    setShowHint(false);
    setSelectedChoice(null);
    if (currentStep < selectedModule.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Module complete
      setModuleComplete(true);
      const correctCount = Object.values(answers).filter(a => a === "correct").length + (isCorrect ? 1 : 0);
      const totalSteps = selectedModule.steps.length;
      const score = Math.round((correctCount / totalSteps) * 100);

      if (staffId && selectedModule) {
        const dbModuleId = MODULE_DB_MAP[selectedModule.id];
        if (dbModuleId) {
          recordCompletion.mutate({
            staffId,
            moduleId: dbModuleId,
            passed: score >= 80,
            assessmentScore: score,
            completedAt: new Date(),
          }, {
            onSuccess: () => {
              // Completion recorded
            },
            onError: (err) => {
              console.error("Failed to record training completion:", err);
            },
          });
        }
      }
    }
  };

  const resetModule = () => {
    setCurrentStep(0);
    setAnswers({});
    setShowFeedback(false);
    setShowHint(false);
    setModuleComplete(false);
    setIsCorrect(false);
    setSelectedChoice(null);
  };

  const exitModule = () => {
    setSelectedModule(null);
    resetModule();
  };

  // ============ MODULE SELECTION VIEW ============
  if (!selectedModule) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-amber-400" />
              POS Training Mode
            </h2>
            <p className="text-sm text-zinc-400">
              {staffName ? `Training for ${staffName}` : "Interactive training modules"} — learn by doing
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {TRAINING_MODULES.map(mod => {
            const completedSteps = Object.keys(answers).filter(k => k.startsWith(mod.id)).length;
            const difficultyColor = mod.difficulty === "beginner" ? "text-green-400" :
              mod.difficulty === "intermediate" ? "text-amber-400" : "text-red-400";

            return (
              <Card
                key={mod.id}
                className="bg-zinc-800/60 border-zinc-700 hover:border-amber-500/50 cursor-pointer transition-all"
                onClick={() => { setSelectedModule(mod); resetModule(); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-zinc-700/50 text-amber-400">
                      {mod.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{mod.title}</h3>
                        <Badge variant="outline" className={`text-xs ${difficultyColor} border-current`}>
                          {mod.difficulty}
                        </Badge>
                      </div>
                      <p className="text-sm text-zinc-400 mb-2">{mod.description}</p>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> {mod.steps.length} scenarios
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> ~{mod.estimatedMinutes} min
                        </span>
                        <span>Required for: {mod.requiredFor.join(", ")}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-500 mt-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ============ MODULE COMPLETE VIEW ============
  if (moduleComplete) {
    const correctCount = Object.values(answers).filter(a => a === "correct").length;
    const totalSteps = selectedModule.steps.length;
    const score = Math.round((correctCount / totalSteps) * 100);
    const passed = score >= 80;

    return (
      <div className="space-y-6">
        <Card className="bg-zinc-800/60 border-zinc-700">
          <CardContent className="p-8 text-center">
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${passed ? "bg-green-500/20" : "bg-amber-500/20"}`}>
              {passed ? <Trophy className="w-8 h-8 text-green-400" /> : <RotateCcw className="w-8 h-8 text-amber-400" />}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {passed ? "Module Complete!" : "Keep Practicing"}
            </h2>
            <p className="text-zinc-400 mb-4">
              {selectedModule.title} — Score: {score}%
            </p>
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-3xl font-bold text-white">{correctCount}</span>
              <span className="text-zinc-500">/</span>
              <span className="text-3xl font-bold text-zinc-500">{totalSteps}</span>
              <span className="text-sm text-zinc-500 ml-2">correct</span>
            </div>
            {passed ? (
              <p className="text-green-400 text-sm mb-6">
                You passed! This module is marked as complete in your training record.
              </p>
            ) : (
              <p className="text-amber-400 text-sm mb-6">
                You need 80% to pass. Review the feedback and try again — you'll get it!
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={exitModule} className="border-zinc-600">
                Back to Modules
              </Button>
              <Button onClick={resetModule} className="bg-amber-600 hover:bg-amber-700">
                <RotateCcw className="w-4 h-4 mr-2" /> Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ ACTIVE TRAINING VIEW ============
  const step = selectedModule.steps[currentStep];
  const progress = ((currentStep) / selectedModule.steps.length) * 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={exitModule}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Exit
          </Button>
          <div>
            <h3 className="font-semibold text-white">{selectedModule.title}</h3>
            <p className="text-xs text-zinc-500">
              Step {currentStep + 1} of {selectedModule.steps.length}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-zinc-400 border-zinc-600">
          {selectedModule.difficulty}
        </Badge>
      </div>

      {/* Progress */}
      <Progress value={progress} className="h-2" />

      {/* Scenario Card */}
      <Card className="bg-zinc-800/60 border-zinc-700">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-amber-400" />
            <CardTitle className="text-lg text-white">{step.title}</CardTitle>
          </div>
          <CardDescription className="text-zinc-300 text-base mt-2">
            {step.instruction}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Hint */}
          {!showFeedback && (
            <div className="space-y-4">
              {showHint && step.hint && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-300">
                    <strong>Hint:</strong> {step.hint}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                {!showHint && step.hint && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHint(true)}
                    className="border-zinc-600 text-zinc-400"
                  >
                    Show Hint
                  </Button>
                )}
              </div>

              {/* Multiple Choice Answers */}
              <div className="pt-4 border-t border-zinc-700">
                <p className="text-sm text-zinc-500 mb-3">Choose the best answer:</p>
                <div className="space-y-2">
                  {step.choices ? step.choices.map((choice, ci) => (
                    <button
                      key={ci}
                      onClick={() => handleAnswer(ci)}
                      disabled={showFeedback}
                      className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${
                        showFeedback && selectedChoice === ci
                          ? choice.correct
                            ? "bg-green-500/20 border-green-500/40 text-green-300"
                            : "bg-red-500/20 border-red-500/40 text-red-300"
                          : showFeedback && choice.correct
                            ? "bg-green-500/10 border-green-500/30 text-green-400"
                            : showFeedback
                              ? "border-zinc-700 text-zinc-600 opacity-50"
                              : "border-zinc-700 text-zinc-300 hover:border-amber-500/50 hover:bg-amber-500/5"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                          showFeedback && selectedChoice === ci
                            ? choice.correct ? "border-green-500 text-green-400" : "border-red-500 text-red-400"
                            : showFeedback && choice.correct
                              ? "border-green-500 text-green-400"
                              : "border-zinc-600 text-zinc-500"
                        }`}>
                          {String.fromCharCode(65 + ci)}
                        </span>
                        {choice.text}
                        {showFeedback && selectedChoice === ci && (
                          choice.correct
                            ? <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto flex-shrink-0" />
                            : <XCircle className="w-4 h-4 text-red-400 ml-auto flex-shrink-0" />
                        )}
                        {showFeedback && choice.correct && selectedChoice !== ci && (
                          <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto flex-shrink-0" />
                        )}
                      </span>
                    </button>
                  )) : (
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleAnswer(0)}
                        className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> I Know This
                      </Button>
                      <Button
                        onClick={() => handleAnswer(1)}
                        className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30"
                      >
                        <XCircle className="w-4 h-4 mr-2" /> I'm Not Sure
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Feedback */}
          {showFeedback && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${
                isCorrect
                  ? "bg-green-500/10 border-green-500/20"
                  : "bg-red-500/10 border-red-500/20"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={`font-semibold ${isCorrect ? "text-green-400" : "text-red-400"}`}>
                    {isCorrect ? "Correct!" : "Here's what you need to know:"}
                  </span>
                </div>
                <p className="text-sm text-zinc-300">
                  {isCorrect ? step.correctFeedback : step.incorrectFeedback}
                </p>
              </div>

              <Button onClick={handleNext} className="w-full bg-amber-600 hover:bg-amber-700">
                {currentStep < selectedModule.steps.length - 1 ? (
                  <>Next Scenario <ChevronRight className="w-4 h-4 ml-2" /></>
                ) : (
                  <>Finish Module <Trophy className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step indicators */}
      <div className="flex gap-1 justify-center">
        {selectedModule.steps.map((s, i) => (
          <div
            key={s.id}
            className={`w-2 h-2 rounded-full ${
              i === currentStep ? "bg-amber-400" :
              answers[s.id] === "correct" ? "bg-green-400" :
              answers[s.id] === "incorrect" ? "bg-red-400" :
              "bg-zinc-600"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
