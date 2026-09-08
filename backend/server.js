const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let mainGridStatus = "ONLINE";
let batteryCapacity = 90; // percentage
let totalBatteryKWh = 500; // max capacity in kWh
let logs = [`${new Date().toLocaleTimeString()} - SRM Ramapuram Campus Microgrid Server initialized.`];

// SRM Ramapuram Buildings & Load Characteristics
let rooms = [
  { id: "geetham_hall", name: "Geetham Hall", block: "Main Zone", loadKW: 45, value: 100, isOccupied: true, hasChiefGuest: true, isEmergency: false, eventTitle: "SRM Ramapuram International Tech Summit" },
  { id: "gallery_1", name: "Gallery Hall 1", block: "TRP / BMS Wing", loadKW: 15, value: 40, isOccupied: true, hasChiefGuest: false, isEmergency: false, eventTitle: "CSE Department Guest Lecture" },
  { id: "gallery_2", name: "Gallery Hall 2", block: "TRP / BMS Wing", loadKW: 15, value: 10, isOccupied: false, hasChiefGuest: false, isEmergency: false, eventTitle: "Vacant" },
  { id: "gallery_3", name: "Gallery Hall 3", block: "TRP / BMS Wing", loadKW: 15, value: 90, isOccupied: true, hasChiefGuest: true, isEmergency: false, eventTitle: "National Biotech Workshop" },
  { id: "gallery_4", name: "Gallery Hall 4", block: "TRP / BMS Wing", loadKW: 15, value: 10, isOccupied: false, hasChiefGuest: false, isEmergency: false, eventTitle: "Vacant" },
  { id: "gallery_5", name: "Gallery Hall 5", block: "TRP / BMS Wing", loadKW: 15, value: 30, isOccupied: true, hasChiefGuest: false, isEmergency: false, eventTitle: "Architecture Design Review" },
  { id: "main_admin_block", name: "Main & Admin Block", block: "Entrance Zone", loadKW: 50, value: 60, isOccupied: true, hasChiefGuest: false, isEmergency: false, eventTitle: "Placement & Counseling Cell" },
  { id: "engg_tech_block", name: "Engineering Block (ECE/Mech/Civil)", block: "Academic Zone", loadKW: 60, value: 50, isOccupied: true, hasChiefGuest: false, isEmergency: false, eventTitle: "Core Practicals & Labs" },
  { id: "bms_cac_block", name: "BMS Block (CAC & Tech Labs)", block: "TRP / BMS Wing", loadKW: 55, value: 70, isOccupied: true, hasChiefGuest: false, isEmergency: false, eventTitle: "HPC Computing Lab" },
  { id: "trp_biotech", name: "TRP Building (Biotech)", block: "TRP / BMS Wing", loadKW: 40, value: 65, isOccupied: true, hasChiefGuest: false, isEmergency: false, eventTitle: "Genomics Research" },
  { id: "arch_film_wing", name: "B.Arch & Film Tech Wing", block: "Media Zone", loadKW: 35, value: 40, isOccupied: true, hasChiefGuest: false, isEmergency: false, eventTitle: "Editing & Studio Suite" },
  { id: "srm_hospital", name: "SRM Prime Hospital", block: "Healthcare & Hostels", loadKW: 80, value: 1000, isOccupied: true, hasChiefGuest: false, isEmergency: true, eventTitle: "Emergency Wards & ICU" },
  { id: "hostels", name: "Boys & Girls Hostels", block: "Healthcare & Hostels", loadKW: 70, value: 30, isOccupied: true, hasChiefGuest: false, isEmergency: false, eventTitle: "Residential Quarters" },
  { id: "sports_complex", name: "Sports Complex & Turf", block: "Recreation Zone", loadKW: 25, value: 5, isOccupied: false, hasChiefGuest: false, isEmergency: false, eventTitle: "Open Grounds" }
];

// Helper: Calculate total dynamic power draw
const calculateCurrentLoad = () => {
  return rooms.reduce((acc, r) => {
    const isPowered = mainGridStatus === "ONLINE" || (r.isOccupied && r.hasChiefGuest) || (r.id === 'srm_hospital' && r.isEmergency);
    return acc + (isPowered ? r.loadKW : 0);
  }, 0);
};

// Simulation Loop: Drain Battery when Grid is OFFLINE
setInterval(() => {
  if (mainGridStatus === "OFFLINE" && batteryCapacity > 0) {
    const activeLoadKW = calculateCurrentLoad();
    const drainAmount = (activeLoadKW / totalBatteryKWh) * 0.2;
    batteryCapacity = Math.max(0, +(batteryCapacity - drainAmount).toFixed(1));
    
    if (batteryCapacity === 0) {
      logs.unshift(`${new Date().toLocaleTimeString()} - ⚠️ CRITICAL: Campus Battery depleted! Emergency shutdowns initiated.`);
    }
  }
}, 3000);

// API Endpoints
app.get('/api/simulation/status', (req, res) => {
  const currentLoadKW = calculateCurrentLoad();
  const estimatedHoursLeft = currentLoadKW > 0 ? (((batteryCapacity / 100) * totalBatteryKWh) / currentLoadKW).toFixed(1) : "N/A";

  res.json({
    mainGridStatus,
    batteryCapacity,
    totalBatteryKWh,
    currentLoadKW,
    estimatedHoursLeft,
    rooms,
    logs
  });
});

app.post('/api/grid/toggle', (req, res) => {
  mainGridStatus = mainGridStatus === "ONLINE" ? "OFFLINE" : "ONLINE";
  const logMsg = `${new Date().toLocaleTimeString()} - Main TNEB Grid toggled to ${mainGridStatus}. ${mainGridStatus === "OFFLINE" ? "Battery backup engaged." : "Normal grid restored."}`;
  logs.unshift(logMsg);
  res.json({ success: true, mainGridStatus, logs });
});

// Knapsack Solver Endpoint
app.post('/api/knapsack/run', (req, res) => {
  const maxCapacityKW = (mainGridStatus === "OFFLINE") 
    ? ((batteryCapacity / 100) * totalBatteryKWh) 
    : 1000;

  // 1. Calculate Priority Scores
  const rankedRooms = [...rooms].map(room => {
    let weight = room.loadKW;
    let profit = room.value;
    
    if (room.isEmergency && room.id === 'srm_hospital') profit += 10000; 
    if (room.hasChiefGuest && room.isOccupied) profit += 5000;          
    if (!room.isOccupied) profit = 0; // Vacant rooms get 0 score

    return { ...room, profit, weight };
  })
  // 2. Sort PURELY by Priority Score (Profit) first, then by smaller load second
  .sort((a, b) => {
    if (b.profit !== a.profit) {
      return b.profit - a.profit; // Highest priority wins
    }
    return a.weight - b.weight;   // Tie-breaker: smaller load wins
  });

  let currentWeightKW = 0;
  const allocationResults = rankedRooms.map(item => {
    // Only allocate power if there is enough capacity AND priority > 0 (or grid is online)
    if (currentWeightKW + item.weight <= maxCapacityKW && (item.profit > 0 || mainGridStatus === "ONLINE")) {
      currentWeightKW += item.weight;
      return { id: item.id, name: item.name, allocated: true, kw: item.weight, priorityScore: item.profit };
    } else {
      return { id: item.id, name: item.name, allocated: false, kw: item.weight, priorityScore: item.profit };
    }
  });

  const timestamp = new Date().toLocaleTimeString();
  logs.unshift(`${timestamp} - 🧮 Knapsack Algorithm Executed: ${currentWeightKW.toFixed(0)} kW allocated out of ${maxCapacityKW.toFixed(0)} kW max capacity.`);

  res.json({
    timestamp,
    maxCapacityKW,
    totalAllocatedKW: currentWeightKW,
    allocations: allocationResults,
    logs
  });
});

app.post('/api/rooms/book', (req, res) => {
  const { id, eventTitle, hasChiefGuest, isEmergency } = req.body;
  rooms = rooms.map(r => r.id === id ? { ...r, isOccupied: true, eventTitle, hasChiefGuest, isEmergency: id === 'srm_hospital' ? isEmergency : false } : r);
  
  const target = rooms.find(r => r.id === id);
  logs.unshift(`${new Date().toLocaleTimeString()} - ${target.name} reserved: "${eventTitle}"`);
  res.json({ success: true, rooms, logs });
});
// Status Telemetry Endpoint
app.get('/api/simulation/status', (req, res) => {
  res.json({
    mainGridStatus: "ONLINE",
    batteryReserve: 450, // or your dynamic variable
    totalBatteryKWh: 500,
    activeDemand: 350,
    batteryCapacity: 90,
    estimatedRuntime: "~1.3 Hours Remaining",
    logs: logs || []
  });
});
// 1. Status Telemetry Endpoint (This was missing!)
app.get('/api/simulation/status', (req, res) => {
  res.json({
    mainGridStatus: "ONLINE",
    batteryReserve: 450,
    totalBatteryKWh: 500,
    activeDemand: 350,
    batteryCapacity: 90,
    estimatedRuntime: "~1.3 Hours Remaining",
    logs: logs || []
  });
});

// 2. Existing Booking Route
app.post('/api/rooms/book', (req, res) => {
  const { id, eventTitle, hasChiefGuest, isEmergency } = req.body;
  rooms = rooms.map(r => r.id === id ? { ...r, isOccupied: true, eventTitle, hasChiefGuest, isEmergency: id === 'srm_hospital' ? isEmergency : false } : r);
  
  const target = rooms.find(r => r.id === id);
  logs.unshift(`${new Date().toLocaleTimeString()} - ${target.name} reserved: "${eventTitle}"`);
  res.json({ success: true, rooms, logs });
});

// 3. Fix port for Render deployment
const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => console.log(`Backend running on port ${PORT}`));
