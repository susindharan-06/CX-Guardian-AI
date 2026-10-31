// server/demo_data_generator.js
// Generates 520+ realistic synthetic feedback records labeled as [DEMO DATA]
// Matches all 13 required fields:
// customer_id, feedback_id, feedback_text, rating, product, location, source, date,
// order_id, transaction_id, delivery_partner, order_status, refund_status

const CITIES = [
  { city: 'Chennai', state: 'Tamil Nadu', weight: 35 }, // Hotspot for delivery delay cluster
  { city: 'Bangalore', state: 'Karnataka', weight: 20 }, // Hotspot for refund / payment cluster
  { city: 'Mumbai', state: 'Maharashtra', weight: 15 },
  { city: 'Delhi', state: 'Delhi NCR', weight: 12 },
  { city: 'Hyderabad', state: 'Telangana', weight: 8 },
  { city: 'Pune', state: 'Maharashtra', weight: 5 },
  { city: 'Coimbatore', state: 'Tamil Nadu', weight: 3 },
  { city: 'Madurai', state: 'Tamil Nadu', weight: 2 }
];

const PRODUCTS = [
  'SmartHome Hub Pro',
  'Smart Air Purifier X1',
  'UltraSound ANC Headphones',
  '4K Security Camera 360',
  'ErgoDesk Smart Controller',
  'SwiftCharge 100W PowerBank'
];

const SOURCES = [
  'Customer Reviews',
  'Customer Surveys',
  'Support Tickets',
  'Social Media',
  'Contact Center'
];

const DELIVERY_PARTNERS = [
  'ExpressLogistics', // Primary bottleneck for Chennai
  'BlueDart Express',
  'Delhivery Prime',
  'Shadowfax Logistics',
  'SpeedPost India'
];

const CUSTOMER_TIERS = ['Enterprise', 'VIP', 'Premium', 'Regular', 'New'];

// Templates for realistic feedback
const ISSUE_TEMPLATES = {
  // Cluster 1: Chennai Delivery Delays via ExpressLogistics
  chennai_delivery: [
    "Package stuck at Chennai central depot for 5 days with no movement. Tracking shows out for delivery but nothing arrived.",
    "Terrible delivery experience in Chennai. ExpressLogistics agent never called and marked customer unavailable falsely.",
    "Ordered my SmartHome Hub Pro last week in Chennai, still waiting. Delivery date got postponed 3 times.",
    "ExpressLogistics depot in Chennai has zero customer support. Delivery is delayed by over 96 hours.",
    "Very slow transit in Chennai. The delivery partner ExpressLogistics claims delivery attempted when I was home all day.",
    "Delivery delayed for 6 days in Chennai Guindy area. Courier says shortage of delivery executives.",
    "Urgent order in Chennai still pending at sorting hub. ExpressLogistics is consistently failing their 48-hour delivery promise.",
    "Worst logistics service in Chennai! Item was supposed to reach by Monday, now it is Friday and status is unchanged."
  ],

  // Cluster 2: Payment Gateway & Refund Callback Timeouts
  payment_refund: [
    "Money deducted from HDFC UPI account but order failed and no order ID was generated. Refund still pending after 7 days.",
    "Cancelled the order within 10 minutes, but my refund of ₹4,299 has not been credited. Bank says gateway timeout callback failed.",
    "Double charged during payment checkout. Customer support ticket #7842 is still open without any refund resolution.",
    "UPI transaction timed out at payment screen. Bank confirmed debit, but platform shows payment pending and refund not initiated.",
    "Payment gateway error at checkout. Amount deducted twice. Refund status shows processing for over 10 business days.",
    "Requested order return and refund 8 days ago. Support keeps asking for bank statement while refund status is stuck.",
    "RazorPay gateway callback timed out on checkout. My money is blocked and no confirmation email received."
  ],

  // Cluster 3: Smart Air Purifier Sensor QA Defect (Batch #QA-2026-X1)
  product_quality: [
    "Smart Air Purifier X1 PM2.5 dust sensor keeps blinking red and showing erroneous 999 AQI readings out of the box.",
    "Air Purifier sensor stopped working within 48 hours of unboxing. Filter smells like burning plastic.",
    "Device arrived with cracked front panel. Packaging was intact, so factory quality control is clearly defective.",
    "The noise level on my UltraSound ANC Headphones is unbearable. Left earcup has static buzz on high ANC mode.",
    "Smart Air Purifier fan motor makes a loud rattling sound on night mode. Factory quality check failure.",
    "Headphones hinge snapped on first week of gentle use. Cheap plastic materials used in this batch.",
    "Received defective SmartHome Hub Pro. Device fails to boot and power LED stays off. Complete QC disaster."
  ],

  // Cluster 4: Customer Support Agent Unresponsiveness & Bot Loops
  customer_support: [
    "Your chatbot is completely useless. It loops back to the main menu without connecting to any human agent.",
    "Waited 45 minutes on contact center phone call and agent abruptly hung up without giving a ticket ID.",
    "Support team closed my escalation ticket #9102 without actually resolving the issue or calling me.",
    "Unhelpful and rude customer service representative on chat. Refused to escalate to a senior supervisor.",
    "Email response from customer care took 6 days only to give a generic scripted copy-paste reply.",
    "Tickets are automatically closed after 24 hours even when the customer is waiting for a resolution."
  ],

  // Positive Reviews
  positive: [
    "Outstanding product! SmartHome Hub Pro integrated seamlessly with all my smart devices in under 5 minutes.",
    "Super fast delivery by BlueDart in Bangalore! Arrived in under 24 hours and packaging was immaculate.",
    "Loved the noise cancellation on UltraSound ANC Headphones. Crisp bass and long battery life. 5 stars!",
    "Customer support agent Rahul was very courteous and helped set up my Smart Air Purifier immediately.",
    "Best smart home product on the market. Extremely satisfied with build quality and responsive app.",
    "Received order a day earlier than expected in Delhi. Very impressed with the quick shipping and updates.",
    "High quality materials and intuitive setup. Worth every rupee spent on the Smart Air Purifier X1."
  ],

  // Neutral Reviews
  neutral: [
    "Product is decent and works as described, but user manual lacks clear setup diagrams.",
    "Average experience. Delivery took the standard 4 days. Nothing exceptional, nothing bad.",
    "App user interface could be improved. The hardware is fine but Bluetooth pairing is a bit sluggish.",
    "Acceptable sound quality for the price point. Packaging was slightly scuffed on corners.",
    "Standard delivery time. Product works fine so far, will update review after one month of usage."
  ]
};

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickWeightedCity() {
  const total = CITIES.reduce((acc, c) => acc + c.weight, 0);
  let random = Math.random() * total;
  for (const c of CITIES) {
    if (random < c.weight) return c.city;
    random -= c.weight;
  }
  return CITIES[0].city;
}

function generateDemoRecords(count = 525) {
  const records = [];
  const now = new Date();

  for (let i = 1; i <= count; i++) {
    const feedbackId = `FB-${String(i).padStart(5, '0')}`;
    const custNum = getRandomInt(1001, 1450); // Some repeat customers
    const customerId = `CUST-${custNum}`;
    const orderId = `ORD-2026-${getRandomInt(10000, 99999)}`;
    const transactionId = `TXN-${getRandomInt(1000000, 9999999)}`;
    const source = getRandomItem(SOURCES);
    const tier = getRandomItem(CUSTOMER_TIERS);

    // Date over the last 30 days
    const daysAgo = getRandomInt(0, 28);
    const hoursAgo = getRandomInt(0, 23);
    const dateObj = new Date(now.getTime() - (daysAgo * 86400000) - (hoursAgo * 3600000));
    const dateStr = dateObj.toISOString().split('T')[0];

    // Determine type of feedback based on realistic distribution:
    // 35% Negative (concentrated in key issues for real clustering), 45% Positive, 20% Neutral
    const rand = Math.random();
    let text = '';
    let rating = 5;
    let city = pickWeightedCity();
    let product = getRandomItem(PRODUCTS);
    let partner = getRandomItem(DELIVERY_PARTNERS);
    let orderStatus = 'Delivered';
    let refundStatus = 'None';
    let sentiment = 'Positive';
    let category = 'Product Quality';

    if (rand < 0.35) {
      // Negative Complaint
      const issueTypeRand = Math.random();
      if (issueTypeRand < 0.45) {
        // Cluster 1: Delivery Delay in Chennai
        city = 'Chennai';
        partner = 'ExpressLogistics';
        product = getRandomItem(['SmartHome Hub Pro', 'Smart Air Purifier X1']);
        text = getRandomItem(ISSUE_TEMPLATES.chennai_delivery);
        rating = getRandomItem([1, 2]);
        orderStatus = 'In Transit - Delayed';
        refundStatus = 'None';
        category = 'Delivery';
        sentiment = 'Negative';
      } else if (issueTypeRand < 0.70) {
        // Cluster 2: Payment / Refund Gateway Timeout
        product = getRandomItem(PRODUCTS);
        partner = getRandomItem(DELIVERY_PARTNERS);
        text = getRandomItem(ISSUE_TEMPLATES.payment_refund);
        rating = 1;
        orderStatus = getRandomItem(['Failed', 'Cancelled']);
        refundStatus = getRandomItem(['Pending Callback', 'Processing Overdue', 'Failed']);
        category = getRandomItem(['Refund', 'Payment']);
        sentiment = 'Negative';
      } else if (issueTypeRand < 0.88) {
        // Cluster 3: Product Quality (Air Purifier dust sensor)
        product = 'Smart Air Purifier X1';
        partner = getRandomItem(DELIVERY_PARTNERS);
        text = getRandomItem(ISSUE_TEMPLATES.product_quality);
        rating = getRandomItem([1, 2]);
        orderStatus = 'Delivered';
        refundStatus = getRandomItem(['None', 'Return Requested']);
        category = 'Product Quality';
        sentiment = 'Negative';
      } else {
        // Cluster 4: Customer Support Unresponsive
        text = getRandomItem(ISSUE_TEMPLATES.customer_support);
        rating = getRandomItem([1, 2]);
        orderStatus = 'Delivered';
        refundStatus = 'None';
        category = 'Customer Support';
        sentiment = 'Negative';
      }
    } else if (rand < 0.80) {
      // Positive Feedback
      text = getRandomItem(ISSUE_TEMPLATES.positive);
      rating = getRandomItem([4, 5]);
      orderStatus = 'Delivered';
      refundStatus = 'None';
      category = 'Product Quality';
      sentiment = 'Positive';
    } else {
      // Neutral Feedback
      text = getRandomItem(ISSUE_TEMPLATES.neutral);
      rating = 3;
      orderStatus = 'Delivered';
      refundStatus = 'None';
      category = getRandomItem(['Product Quality', 'Delivery', 'Other']);
      sentiment = 'Neutral';
    }

    records.push({
      customer_id: customerId,
      customer_tier: tier,
      feedback_id: feedbackId,
      feedback_text: `[DEMO DATA] ${text}`,
      rating: rating,
      product: product,
      location: city,
      source: source,
      date: dateStr,
      order_id: orderId,
      transaction_id: transactionId,
      delivery_partner: partner,
      order_status: orderStatus,
      refund_status: refundStatus,
      raw_sentiment: sentiment,
      assigned_category: category,
      created_at: dateObj.toISOString()
    });
  }

  return records;
}

module.exports = {
  generateDemoRecords,
  CITIES,
  PRODUCTS,
  SOURCES,
  DELIVERY_PARTNERS
};
