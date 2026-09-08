import React, { useState, useEffect } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'booking' | 'logs'
  const [showKnapsackModal, setShowKnapsackModal] = useState(false);
  const [knapsackData, setKnapsackData] = useState(null);

  const [data, setData] = useState({
    mainGridStatus: "ONLINE",
    batteryCapacity: 90,
    totalBatteryKWh: 500,
    currentLoadKW: 350,
    estimatedHoursLeft: "1.3",
    rooms: [
      { id: "geetham_hall", name: "Geetham Hall", block: "Main Zone", loadKW: 45, isOccupied: true, hasChiefGuest: true, isEmergency: false, eventTitle: "SRM Ramapuram International Tech Summit" },
      { id: "gallery_1", name: "Gallery Hall 1", block: "TRP / BMS Wing", loadKW: 15, isOccupied: true, hasChiefGuest: false, isEmergency: false, eventTitle: "CSE Department Guest Lecture" },
      { id: "gallery_2", name: "Gallery Hall 2", block: "TRP / BMS Wing", loadKW: 15, isOccupied: false, hasChiefGuest: false, isEmergency: false, eventTitle: "Vacant" },
      { id: "gallery_3", name: "Gallery Hall 3", block: "TRP / BMS Wing", loadKW: 15, isOccupied: true, hasChiefGuest: true, isEmergency: false, eventTitle: "National Biotech Workshop" },
      { id: "gallery_4", name: "Gallery Hall 4", block: "TRP / BMS Wing", loadKW: 15, isOccupied: false, hasChiefGuest: false, isEmergency: false, eventTitle: "Vacant" },
      { id: "gallery_5", name: "Gallery Hall 5", block: "TRP / BMS Wing", loadKW: 15, isOccupied: true, hasChiefGuest: false, isEmergency: false, eventTitle: "Architecture Design Review" },
      { id: "main_admin_block", name: "Main & Admin Block", block: "Entrance Zone", loadKW: 50, isOccupied: true, hasChiefGuest: false, isEmergency: false, eventTitle: "Placement & Counseling Cell" },
      { id: "engg_tech_block", name: "Engineering Block (ECE/Mech/Civil)", block: "Academic Zone", loadKW: 60, isOccupied: true, hasChiefGuest: false, isEmergency: false, eventTitle: "Core Practicals & Labs" },
      { id: "bms_cac_block", name: "BMS Block (CAC & Tech Labs)", block: "TRP / BMS Wing", loadKW: 55, isOccupied: true, hasChiefGuest: false, isEmergency: false, eventTitle: "HPC Computing Lab" },
      { id: "trp_biotech", name: "TRP Building (Biotech)", block: "TRP / BMS Wing", loadKW: 40, isOccupied: true, hasChiefGuest: false, isEmergency: false, eventTitle: "Genomics Research" },
      { id: "arch_film_wing", name: "B.Arch & Film Tech Wing", block: "Media Zone", loadKW: 35, isOccupied: true, hasChiefGuest: false, isEmergency: false, eventTitle: "Editing & Studio Suite" },
      { id: "srm_hospital", name: "SRM Prime Hospital", block: "Healthcare & Hostels", loadKW: 80, isOccupied: true, hasChiefGuest: false, isEmergency: true, eventTitle: "Emergency Wards & ICU" },
      { id: "hostels", name: "Boys & Girls Hostels", block: "Healthcare & Hostels", loadKW: 70, isOccupied: true, hasChiefGuest: false, isEmergency: false, eventTitle: "Residential Quarters" },
      { id: "sports_complex", name: "Sports Complex & Turf", block: "Recreation Zone", loadKW: 25, isOccupied: false, hasChiefGuest: false, isEmergency: false, eventTitle: "Open Grounds" }
    ],
    logs: []
  });

  // VIP Booking Form State
  const [selectedRoomId, setSelectedRoomId] = useState('geetham_hall');
  const [eventTitle, setEventTitle] = useState('');
  const [hasChiefGuestInput, setHasChiefGuestInput] = useState(false);
  const [isEmergencyInput, setIsEmergencyInput] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('https://smart-energy-supply.onrender.com/api/simulation/status',{ method: 'POST',});
      if (res.ok) {
        const json = await res.json();
        setData(prev => ({ ...prev, ...json }));
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const toggleGrid = async () => {
  // 1. Optimistically update local UI state immediately so it doesn't flicker
  const newStatus = data.mainGridStatus === "ONLINE" ? "OFFLINE" : "ONLINE";
  setData(prev => ({ ...prev, mainGridStatus: newStatus }));

  try {
    // 2. Send toggle request to backend
    const res = await fetch('https://smart-energy-supply.onrender.com/api/grid/toggle',{ method: 'POST',});
    if (res.ok) {
      const json = await res.json();
      // 3. Sync UI with backend confirmation
      setData(prev => ({ ...prev, mainGridStatus: json.mainGridStatus, logs: json.logs }));
    }
  } catch (err) {
    console.error("Failed to toggle grid:", err);
  }
};
  const runKnapsackOptimization = async () => {
  try {
    const res = await fetch('https://smart-energy-supply.onrender.com/api/knapsack/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      const json = await res.json();
      setKnapsackData(json);
      setShowKnapsackModal(true);
      fetchStatus();
    }
  } catch (err) {
    console.error("Failed to run knapsack optimization:", err);
  }
};

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    const payload = { 
      id: selectedRoomId, 
      eventTitle, 
      hasChiefGuest: hasChiefGuestInput, 
      isEmergency: selectedRoomId === 'srm_hospital' ? isEmergencyInput : false, 
      isOccupied: true 
    };

    try {
      await fetch('https://smart-energy-supply.onrender.com/api/simulation/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      fetchStatus();
    } catch (err) {
      setData(prev => ({
        ...prev,
        rooms: prev.rooms.map(r => r.id === selectedRoomId ? { ...r, ...payload } : r)
      }));
    }

    setEventTitle('');
    setActiveTab('map');
  };

  const isGridOnline = data.mainGridStatus === "ONLINE";

  // Single Map Block Renderer
  const renderMapBlock = (roomId, customFlex = '1 1 200px') => {
    const room = data.rooms.find(r => r.id === roomId) || { name: roomId, loadKW: 0, isOccupied: false, hasChiefGuest: false, isEmergency: false };
    const isPowered = isGridOnline || (room.isOccupied && room.hasChiefGuest) || (room.id === 'srm_hospital' && room.isEmergency);

    return (
      <div 
        key={roomId}
        style={{
          flex: customFlex,
          backgroundColor: '#0f172a',
          border: `2px solid ${room.isEmergency ? '#ef4444' : room.hasChiefGuest ? '#f59e0b' : (isPowered ? '#10b981' : '#ef4444')}`,
          borderRadius: '0.5rem',
          padding: '0.85rem',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justify: 'space-between',
          minWidth: '180px',
          boxShadow: isPowered ? (room.isEmergency ? '0 0 12px rgba(239, 68, 68, 0.4)' : room.hasChiefGuest ? '0 0 12px rgba(245, 158, 11, 0.3)' : '0 0 8px rgba(16, 185, 129, 0.15)') : 'none',
          transition: 'all 0.3s ease'
        }}
      >
        {/* Animated Power Flow Indicator Border line */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: '3px',
          backgroundColor: isPowered ? (isGridOnline ? '#38bdf8' : '#f59e0b') : '#ef4444',
          borderRadius: '0.5rem 0.5rem 0 0',
          opacity: 0.8
        }} />

        {/* Indicators */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', marginTop: '0.2rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isPowered ? '#34d399' : '#f87171' }}>
            {isPowered ? '🟢 POWERED' : '🔴 SHEDDED'} ({room.loadKW} kW)
          </span>
          
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {room.id === 'srm_hospital' && room.isEmergency && (
              <span style={{ fontSize: '0.75rem', backgroundColor: '#ef4444', color: '#fff', padding: '0.1rem 0.3rem', borderRadius: '0.2rem', fontWeight: 700 }}>
                🚨 EMERGENCY
              </span>
            )}
            {room.hasChiefGuest && (
              <span style={{ fontSize: '1.1rem' }} title="Chief Guest Present">⭐</span>
            )}
          </div>
        </div>

        {/* Building Name */}
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc', marginBottom: '0.2rem' }}>
          {room.name}
        </div>

        {/* Event Label */}
        <div style={{ fontSize: '0.75rem', color: room.isOccupied ? '#38bdf8' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {room.isOccupied ? room.eventTitle : 'Vacant Facility'}
        </div>
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#090d16', color: '#f1f5f9', minHeight: '100vh', padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #1e293b' }}>
        <div>
          <h1 style={{ color: '#38bdf8', margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>SRM Ramapuram Campus Map & Microgrid</h1>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
            Bharathi Salai, Ramapuram, Chennai - 600089 | Knapsack Load shedding Telemetry
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={runKnapsackOptimization}
            style={{ padding: '0.75rem 1.25rem', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer' }}
          >
            🧮 RUN KNAPSACK OPTIMIZER
          </button>

          <button 
            onClick={toggleGrid}
            style={{ padding: '0.75rem 1.25rem', backgroundColor: isGridOnline ? '#ef4444' : '#10b981', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer' }}
          >
            {isGridOnline ? '⚡ SIMULATE BLACKOUT' : '🔌 RESTORE MAIN GRID'}
          </button>
        </div>
      </div>

      {/* Dynamic Telemetry Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>MAIN TNEB GRID SUPPLY</span>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.25rem 0 0 0', color: isGridOnline ? '#10b981' : '#ef4444' }}>
            {isGridOnline ? '🟢 Main Grid Operational' : '🔴 Blackout (Battery Routing)'}
          </p>
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>CAMPUS BATTERY RESERVE</span>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.25rem 0 0 0', color: '#38bdf8' }}>
            {data.batteryCapacity}% ({((data.batteryCapacity / 100) * data.totalBatteryKWh).toFixed(0)} kWh)
          </p>
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ACTIVE DEMAND / DRAIN RATE</span>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.25rem 0 0 0', color: '#f59e0b' }}>
            {data.currentLoadKW} kW Dynamic Load
          </p>
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ESTIMATED BATTERY RUNTIME</span>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.25rem 0 0 0', color: '#a7f3d0' }}>
            ~{data.estimatedHoursLeft} Hours Remaining
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => setActiveTab('map')} 
            style={{ padding: '0.5rem 1.25rem', backgroundColor: activeTab === 'map' ? '#0284c7' : 'transparent', color: '#fff', border: 'none', borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer' }}
          >
            🗺️ Spatial Campus Map Diagram
          </button>
          <button 
            onClick={() => setActiveTab('booking')} 
            style={{ padding: '0.5rem 1.25rem', backgroundColor: activeTab === 'booking' ? '#0284c7' : 'transparent', color: '#fff', border: 'none', borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer' }}
          >
            🛡️ VIP & Emergency Priority Booking
          </button>
          <button 
            onClick={() => setActiveTab('logs')} 
            style={{ padding: '0.5rem 1.25rem', backgroundColor: activeTab === 'logs' ? '#0284c7' : 'transparent', color: '#fff', border: 'none', borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer' }}
          >
            📋 Real-Time Activity Logs ({data.logs.length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
          <span>🟢 Powered</span>
          <span>🔴 Shedded</span>
          <span>🚨 Hospital Emergency</span>
          <span>⭐ Chief Guest</span>
        </div>
      </div>

      {/* PAGE 1: CAMPUS MAP BLOCK DIAGRAM */}
      {activeTab === 'map' && (
        <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '1rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
            SRM Ramapuram Spatial Block Layout & Live Power Telemetry
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* ROW 1: Entrance & Admin Zone */}
            <div>
              <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>1. MAIN ENTRANCE & ADMIN ZONE</span>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {renderMapBlock('main_admin_block', '1 1 300px')}
                {renderMapBlock('srm_hospital', '1 1 300px')}
              </div>
            </div>

            {/* ROW 2: Central Academic & Engineering Blocks */}
            <div>
              <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>2. ACADEMIC & ENGINEERING WINGS</span>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {renderMapBlock('engg_tech_block', '1 1 250px')}
                {renderMapBlock('bms_cac_block', '1 1 250px')}
                {renderMapBlock('trp_biotech', '1 1 250px')}
              </div>
            </div>

            {/* ROW 3: Gallery Halls (TRP/BMS Corridor) */}
            <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '0.5rem', border: '1px dashed #334155' }}>
              <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700 }}>3. GALLERY HALL CORRIDOR (TRP / BMS WING)</span>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {renderMapBlock('gallery_1')}
                {renderMapBlock('gallery_2')}
                {renderMapBlock('gallery_3')}
                {renderMapBlock('gallery_4')}
                {renderMapBlock('gallery_5')}
              </div>
            </div>

            {/* ROW 4: Major Auditoriums & Media Wing */}
            <div>
              <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>4. AUDITORIUMS & MEDIA WINGS</span>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {renderMapBlock('geetham_hall', '2 1 350px')}
                {renderMapBlock('arch_film_wing', '1 1 250px')}
              </div>
            </div>

            {/* ROW 5: Hostels & Sports Complex */}
            <div>
              <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>5. RESIDENTIAL & RECREATION ZONE</span>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {renderMapBlock('hostels', '1 1 300px')}
                {renderMapBlock('sports_complex', '1 1 300px')}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* PAGE 2: BOOKING FORM */}
      {activeTab === 'booking' && (
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#1e293b', padding: '2rem', borderRadius: '0.75rem', border: '1px solid #334155' }}>
          <h2 style={{ marginTop: 0, color: '#38bdf8' }}>SRM Ramapuram Reservation & Priority Override</h2>

          <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: '#cbd5e1' }}>Select Campus Building or Hall</label>
              <select 
                value={selectedRoomId} 
                onChange={(e) => setSelectedRoomId(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '0.375rem' }}
              >
                {data.rooms.map(room => (
                  <option key={room.id} value={room.id}>{room.name} — ({room.loadKW} kW)</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: '#cbd5e1' }}>Event / Unit Designation</label>
              <input 
                type="text" 
                placeholder="e.g. Critical ICU Ward / Tech Fest Keynote" 
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '0.375rem' }}
                required
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#0f172a', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #334155' }}>
              <input 
                type="checkbox" 
                id="cgCheck"
                checked={hasChiefGuestInput}
                onChange={(e) => setHasChiefGuestInput(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="cgCheck" style={{ cursor: 'pointer', fontSize: '0.9rem', color: '#fef3c7', fontWeight: 600 }}>
                ⭐ Chief Guest Attending (Enables High-Priority Battery Backup)
              </label>
            </div>

            {selectedRoomId === 'srm_hospital' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#450a0a', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #ef4444' }}>
                <input 
                  type="checkbox" 
                  id="emergencyCheck"
                  checked={isEmergencyInput}
                  onChange={(e) => setIsEmergencyInput(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="emergencyCheck" style={{ cursor: 'pointer', fontSize: '0.9rem', color: '#fca5a5', fontWeight: 700 }}>
                  🚨 Critical Emergency Unit (Guarantees 24/7 Power Priority During Blackouts)
                </label>
              </div>
            )}

            <button 
              type="submit" 
              style={{ padding: '0.85rem', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '0.375rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Confirm Reservation & Safety Priority
            </button>
          </form>
        </div>
      )}

      {/* PAGE 3: AUDIT LOGS TAB */}
      {activeTab === 'logs' && (
        <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #334155' }}>
          <h2 style={{ marginTop: 0, color: '#38bdf8', fontSize: '1.2rem' }}>Real-Time Microgrid Activity & Power Shedding Logs</h2>
          <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '0.5rem', maxHeight: '400px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.85rem' }}>
            {data.logs.map((log, index) => (
              <div key={index} style={{ padding: '0.4rem 0', borderBottom: '1px solid #1e293b', color: log.includes('CRITICAL') ? '#ef4444' : log.includes('Knapsack') ? '#c084fc' : '#cbd5e1' }}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KNAPSACK OPTIMIZATION MODAL / DRAWER */}
      {showKnapsackModal && knapsackData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '0.75rem', width: '90%', maxWidth: '700px', border: '1px solid #8b5cf6' }}>
            <h2 style={{ margin: '0 0 0.5rem 0', color: '#a78bfa' }}>🧮 0/1 Knapsack Power Allocation Breakdown</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Max Available Battery Power: <strong>{knapsackData.maxCapacityKW.toFixed(0)} kW</strong> | Allocated: <strong>{knapsackData.totalAllocatedKW} kW</strong>
            </p>

            <div style={{ maxHeight: '300px', overflowY: 'auto', backgroundColor: '#0f172a', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1.5rem' }}>
              {knapsackData.allocations.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #1e293b', fontSize: '0.85rem' }}>
                  <span>{item.name} ({item.kw} kW) — Priority Score: {item.priorityScore}</span>
                  <span style={{ fontWeight: 700, color: item.allocated ? '#34d399' : '#f87171' }}>
                    {item.allocated ? '✅ POWER ALLOCATED' : '❌ SHEDDED (OUTAGE)'}
                  </span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setShowKnapsackModal(false)}
              style={{ padding: '0.6rem 1.5rem', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '0.375rem', fontWeight: 700, cursor: 'pointer', float: 'right' }}
            >
              Close Results
            </button>
          </div>
        </div>
      )}

    </div>
  );
}