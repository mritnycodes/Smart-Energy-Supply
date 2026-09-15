import React, { useState, useEffect } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'booking' | 'logs'
  const [showKnapsackModal, setShowKnapsackModal] = useState(false);
  const [knapsackResult, setKnapsackResult] = useState(null);
  const [bookingTitle, setBookingTitle] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [isChiefGuestBooking, setIsChiefGuestBooking] = useState(false);

  const [data, setData] = useState({
    mainGridStatus: "BLACKOUT",
    batteryReserve: 450.0,
    totalBatteryKWh: 500.0,
    activeDemand: 350.0,
    batteryCapacity: 90,
    estimatedRuntime: "~1.3 Hours Remaining",
    rooms: [],
    logs: []
  });

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:5001/api/simulation/status');
        if (res.ok) {
          const result = await res.json();
          setData(prev => ({
            ...prev,
            mainGridStatus: result.mainGridStatus,
            batteryReserve: result.batteryReserve,
            totalBatteryKWh: result.totalBatteryKWh,
            activeDemand: result.activeDemand,
            batteryCapacity: result.batteryCapacity,
            estimatedRuntime: result.estimatedRuntime,
            rooms: result.rooms.length > 0 ? result.rooms : prev.rooms,
            logs: result.logs
          }));
        }
      } catch (err) {
        console.error("Backend fetch error:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const toggleMainGrid = async () => {
    const nextStatus = data.mainGridStatus === "BLACKOUT" ? "ONLINE" : "BLACKOUT";
    try {
      const res = await fetch('http://localhost:5001/api/simulation/toggle-grid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const result = await res.json();
      if (result.success) {
        setData(prev => ({ ...prev, mainGridStatus: result.mainGridStatus, logs: result.logs }));
      }
    } catch (err) {
      console.error("Error toggling grid:", err);
    }
  };

  const runKnapsackOptimizer = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/knapsack/run', { method: 'POST' });
      const result = await res.json();
      setKnapsackResult(result);
      setShowKnapsackModal(true);
    } catch (err) {
      console.error("Error running knapsack:", err);
    }
  };

  const handleBookRoom = async (e) => {
    e.preventDefault();
    if (!selectedRoomId || !bookingTitle) {
      alert("Please select a facility and provide an event title.");
      return;
    }

    try {
      const res = await fetch('http://localhost:5001/api/rooms/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedRoomId, 
          eventTitle: bookingTitle,
          isChiefGuest: isChiefGuestBooking 
        })
      });
      const result = await res.json();
      if (result.success) {
        setData(prev => ({ ...prev, rooms: result.rooms, logs: result.logs }));
        alert("VIP / Priority Booking confirmed successfully!");
        setBookingTitle('');
        setSelectedRoomId('');
        setIsChiefGuestBooking(false);
        setActiveTab('map');
      }
    } catch (err) {
      console.error("Booking error:", err);
    }
  };

  const isBlackout = data.mainGridStatus === "BLACKOUT";

  const adminZoneRooms = data.rooms.filter(r => r.zone === "Entrance & Admin Zone");
  const academicRooms = data.rooms.filter(r => r.zone === "Academic Wings");
  const galleryRooms = data.rooms.filter(r => r.zone === "Gallery Corridor");
  const healthcareRooms = data.rooms.filter(r => r.zone === "Healthcare & Hostels" && r.isEmergency);
  const hostelRooms = data.rooms.filter(r => r.zone === "Healthcare & Hostels" && !r.isEmergency);
  const recreationRooms = data.rooms.filter(r => r.zone === "Recreation Zone");

  const getCardStyle = (room) => {
    if (!isBlackout) {
      return styles.greenRoomCard;
    }
    if (room.isEmergency || room.isChiefGuest) {
      return styles.greenRoomCard;
    }
    return styles.redRoomCard;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>SRM Ramapuram Campus Map & Microgrid</h1>
          <p style={styles.subtitle}>Bharathi Salai, Ramapuram, Chennai - 600089 | Knapsack Load shedding Telemetry</p>
        </div>
        <div style={styles.headerButtons}>
          <button style={styles.knapsackBtn} onClick={runKnapsackOptimizer}>
            ⚡ RUN KNAPSACK OPTIMIZER
          </button>
          <button 
            style={isBlackout ? styles.gridRestoreBtn : styles.gridBlackoutBtn} 
            onClick={toggleMainGrid}
          >
            {isBlackout ? "🟢 RESTORE MAIN GRID" : "⚡ SIMULATE BLACKOUT"}
          </button>
        </div>
      </div>

      <div style={styles.cardGrid}>
        <div style={styles.metricCard}>
          <span style={styles.cardLabel}>MAIN TNEB GRID SUPPLY</span>
          <div style={styles.cardValueContainer}>
            <span style={isBlackout ? styles.redDot : styles.greenDot}></span>
            <span style={styles.cardValueText}>
              {isBlackout ? "Blackout (Battery Routing)" : "Online (Normal Supply)"}
            </span>
          </div>
        </div>

        <div style={styles.metricCard}>
          <span style={styles.cardLabel}>CAMPUS BATTERY RESERVE</span>
          <div style={styles.cardValueContainer}>
            <span style={styles.cardValueTextBold}>
              {data.batteryCapacity}% ({data.batteryReserve} kWh)
            </span>
          </div>
        </div>

        <div style={styles.metricCard}>
          <span style={styles.cardLabel}>ACTIVE DEMAND / DRAIN RATE</span>
          <div style={styles.cardValueContainer}>
            <span style={styles.cardValueTextBold}>{data.activeDemand} kW Dynamic Load</span>
          </div>
        </div>

        <div style={styles.metricCard}>
          <span style={styles.cardLabel}>ESTIMATED BATTERY RUNTIME</span>
          <div style={styles.cardValueContainer}>
            <span style={styles.cardValueTextBold}>{data.estimatedRuntime}</span>
          </div>
        </div>
      </div>

      <div style={styles.subBar}>
        <button 
          style={activeTab === 'map' ? styles.activeTabBtn : styles.tabBtn} 
          onClick={() => setActiveTab('map')}
        >
          🗺️ Spatial Campus Map Diagram
        </button>
        <button 
          style={activeTab === 'booking' ? styles.activeTabBtn : styles.tabBtn} 
          onClick={() => setActiveTab('booking')}
        >
          📌 VIP & Emergency Priority Booking
        </button>
        <button 
          style={activeTab === 'logs' ? styles.activeTabBtn : styles.tabBtn} 
          onClick={() => setActiveTab('logs')}
        >
          📋 Real-Time Activity Logs ({data.logs.length})
        </button>
      </div>

      <div style={styles.contentBody}>
        {activeTab === 'map' && (
          <div>
            <h2 style={{ fontSize: '15px', marginBottom: '15px', color: '#f8fafc', letterSpacing: '0.5px' }}>
              SRM RAMAPURAM SPATIAL BLOCK LAYOUT & LIVE POWER TELEMETRY
            </h2>
            
            {/* 1. Main Entrance & Admin Zone */}
            <div style={styles.sectionBox}>
              <h3 style={styles.sectionTitle}>1. MAIN ENTRANCE & ADMIN ZONE</h3>
              <div style={styles.flexRowContainer}>
                {adminZoneRooms.map(room => {
                  const cardStyle = getCardStyle(room);
                  const isGreen = cardStyle === styles.greenRoomCard;
                  return (
                    <div key={room.id} style={cardStyle}>
                      <div style={styles.roomHeaderRow}>
                        <span style={isGreen ? styles.emergencyBadge : styles.sheddedBadge}>
                          {isGreen ? `🟢 POWERED (${room.loadKW} kW)` : `🔴 SHEDDED (${room.loadKW} kW)`}
                        </span>
                        {room.isChiefGuest && <span style={styles.chiefGuestBadge}>★ Chief Guest</span>}
                      </div>
                      <h4 style={styles.roomTitle}>{room.name}</h4>
                      <p style={styles.roomSub}>{room.eventTitle}</p>
                    </div>
                  );
                })}
                {healthcareRooms.map(room => (
                  <div key={room.id} style={styles.greenRoomCard}>
                    <div style={styles.roomHeaderRow}>
                      <span style={styles.emergencyBadge}>🟢 POWERED ({room.loadKW} kW)</span>
                      <span style={styles.emergencyTagBadge}>🚨 EMERGENCY</span>
                    </div>
                    <h4 style={styles.roomTitle}>{room.name}</h4>
                    <p style={styles.roomSub}>{room.eventTitle}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Academic & Engineering Wings */}
            <div style={styles.sectionBox}>
              <h3 style={styles.sectionTitle}>2. ACADEMIC & ENGINEERING WINGS</h3>
              <div style={styles.flexRowContainer}>
                {academicRooms.map(room => {
                  const cardStyle = getCardStyle(room);
                  const isGreen = cardStyle === styles.greenRoomCard;
                  return (
                    <div key={room.id} style={cardStyle}>
                      <div style={styles.roomHeaderRow}>
                        <span style={isGreen ? styles.emergencyBadge : styles.sheddedBadge}>
                          {isGreen ? `🟢 POWERED (${room.loadKW} kW)` : `🔴 SHEDDED (${room.loadKW} kW)`}
                        </span>
                        {room.isChiefGuest && <span style={styles.chiefGuestBadge}>★ Chief Guest</span>}
                      </div>
                      <h4 style={styles.roomTitle}>{room.name}</h4>
                      <p style={styles.roomSub}>{room.eventTitle}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Gallery Hall Corridor */}
            <div style={styles.sectionBox}>
              <h3 style={styles.sectionTitle}>3. GALLERY HALL CORRIDOR (TRP / BMS WING)</h3>
              <div style={styles.flexRowContainerGallery}>
                {galleryRooms.map(room => {
                  const cardStyle = getCardStyle(room);
                  const isGreen = cardStyle === styles.greenRoomCard;
                  return (
                    <div key={room.id} style={cardStyle}>
                      <div style={styles.roomHeaderRow}>
                        <span style={isGreen ? styles.emergencyBadge : styles.sheddedBadge}>
                          {isGreen ? `🟢 POWERED (${room.loadKW} kW)` : `🔴 SHEDDED (${room.loadKW} kW)`}
                        </span>
                        {room.isChiefGuest && <span style={styles.chiefGuestBadge}>★</span>}
                      </div>
                      <h4 style={styles.roomTitleSmall}>{room.name}</h4>
                      <p style={styles.roomSubSmall}>{room.eventTitle}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Hostels & Recreation Zone */}
            <div style={styles.sectionBox}>
              <h3 style={styles.sectionTitle}>4. HOSTELS & RECREATION ZONE</h3>
              <div style={styles.flexRowContainer}>
                {hostelRooms.concat(recreationRooms).map(room => {
                  const cardStyle = getCardStyle(room);
                  const isGreen = cardStyle === styles.greenRoomCard;
                  return (
                    <div key={room.id} style={cardStyle}>
                      <div style={styles.roomHeaderRow}>
                        <span style={isGreen ? styles.emergencyBadge : styles.sheddedBadge}>
                          {isGreen ? `🟢 POWERED (${room.loadKW} kW)` : `🔴 SHEDDED (${room.loadKW} kW)`}
                        </span>
                      </div>
                      <h4 style={styles.roomTitle}>{room.name}</h4>
                      <p style={styles.roomSub}>{room.eventTitle}</p>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {activeTab === 'booking' && (
          <div style={styles.centerBookingWrapper}>
            <div style={styles.bookingCardBox}>
              <h2 style={{ color: '#38bdf8', marginBottom: '10px' }}>📌 VIP & Emergency Priority Booking</h2>
              <p style={{ color: '#94a3b8', marginBottom: '20px', fontSize: '13px' }}>
                Assign custom events, designate chief guest privileges, and reserve campus capacity blocks instantly.
              </p>
              <form onSubmit={handleBookRoom} style={styles.formContainer}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Select Campus Facility / Block:</label>
                  <select 
                    style={styles.selectInput}
                    value={selectedRoomId} 
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                  >
                    <option value="">-- Choose Facility --</option>
                    {data.rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.loadKW} kW)</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Event Title / Description:</label>
                  <input 
                    type="text" 
                    style={styles.textInput}
                    placeholder="e.g. International Tech Symposium"
                    value={bookingTitle}
                    onChange={(e) => setBookingTitle(e.target.value)}
                  />
                </div>
                <div style={styles.checkboxGroup}>
                  <label style={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      checked={isChiefGuestBooking}
                      onChange={(e) => setIsChiefGuestBooking(e.target.checked)}
                    />
                    Mark as Chief Guest VIP Event (★)
                  </label>
                </div>
                <button type="submit" style={styles.submitBtn}>Confirm Booking & Update Microgrid</button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div>
            <h2>Real-Time Activity Logs & Telemetry Stream</h2>
            <div style={styles.logsBox}>
              {data.logs.map((log, index) => (
                <div key={index} style={styles.logItem}>[LOG] {log}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showKnapsackModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContentLarge}>
            <h2 style={{ color: '#38bdf8', marginBottom: '8px' }}>⚡ Knapsack Dynamic Optimization Results</h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '15px' }}>
              {knapsackResult?.message || "Active microgrid load optimization breakdown based on real-time battery thresholds."}
            </p>
            
            <div style={styles.modalGrid}>
              {/* Powered Rooms Column */}
              <div style={styles.modalColumnGreen}>
                <h4 style={{ color: '#4ade80', margin: '0 0 10px 0', fontSize: '13px' }}>
                  🟢 Powered Rooms (Active & Protected)
                </h4>
                <div style={styles.modalList}>
                  {data.rooms.filter(r => {
                    const isPowered = !isBlackout || r.isEmergency || r.isChiefGuest || (r.loadKW <= 20 && data.batteryReserve > 300);
                    return isPowered;
                  }).map(r => (
                    <div key={r.id} style={styles.modalListItem}>
                      <span><b>{r.name}</b></span>
                      <span style={{ color: '#4ade80' }}>
                        {r.loadKW} kW {r.isEmergency ? '(Medical Critical)' : r.isChiefGuest ? '(VIP Priority)' : '(Active)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shedded Rooms Column */}
              <div style={styles.modalColumnRed}>
                <h4 style={{ color: '#ef4444', margin: '0 0 10px 0', fontSize: '13px' }}>
                  🔴 Shedded Rooms (Disconnected for Conservation)
                </h4>
                <div style={styles.modalList}>
                  {data.rooms.filter(r => {
                    const isShedded = isBlackout && !r.isEmergency && !r.isChiefGuest && (r.loadKW > 20 || data.batteryReserve <= 300);
                    return isShedded;
                  }).map(r => (
                    <div key={r.id} style={styles.modalListItem}>
                      <span><b>{r.name}</b></span>
                      <span style={{ color: '#ef4444' }}>{r.loadKW} kW (Shedded)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={styles.algorithmLiveNote}>
              <span><b>Algorithmic Shift Behavior:</b> As battery capacity decreases ($W$), the Knapsack utility loop re-evaluates total weights. High-draw rooms (Hostels, Admin, Engineering) automatically shift from Powered to Shedded to protect core medical and Chief Guest assets.</span>
            </div>

            <div style={styles.algorithmLiveNote}>
              <span><b>Live Telemetry Status:</b> Total Active Drain: <b>{data.activeDemand} kW</b> | Battery Reserve: <b>{data.batteryReserve} kWh ({data.batteryCapacity}%)</b></span>
            </div>

            <button style={styles.closeBtn} onClick={() => setShowKnapsackModal(false)}>Close Optimizer Panel</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '15px' },
  title: { margin: 0, fontSize: '24px', color: '#38bdf8' },
  subtitle: { margin: '5px 0 0 0', fontSize: '13px', color: '#94a3b8' },
  headerButtons: { display: 'flex', gap: '10px' },
  knapsackBtn: { backgroundColor: '#9333ea', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  gridRestoreBtn: { backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  gridBlackoutBtn: { backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' },
  metricCard: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '15px' },
  cardLabel: { fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '8px' },
  cardValueContainer: { display: 'flex', alignItems: 'center', gap: '8px' },
  cardValueText: { fontSize: '15px', color: '#f8fafc', fontWeight: '600' },
  cardValueTextBold: { fontSize: '18px', color: '#38bdf8', fontWeight: 'bold' },
  redDot: { width: '10px', height: '10px', backgroundColor: '#ef4444', borderRadius: '50%', display: 'inline-block' },
  greenDot: { width: '10px', height: '10px', backgroundColor: '#22c55e', borderRadius: '50%', display: 'inline-block' },
  subBar: { display: 'flex', gap: '10px', marginBottom: '20px' },
  tabBtn: { backgroundColor: '#1e293b', color: '#94a3b8', border: '1px solid #334155', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer' },
  activeTabBtn: { backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  contentBody: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '20px' },
  sectionBox: { marginBottom: '25px', backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #334155' },
  sectionTitle: { fontSize: '12px', color: '#38bdf8', marginBottom: '12px', letterSpacing: '0.8px', fontWeight: 'bold' },
  flexRowContainer: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  flexRowContainerGallery: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  redRoomCard: { backgroundColor: '#1e293b', border: '2px solid #ef4444', borderRadius: '6px', padding: '12px', flex: '1 1 220px', minWidth: '200px' },
  greenRoomCard: { backgroundColor: '#1e293b', border: '2px solid #22c55e', borderRadius: '6px', padding: '12px', flex: '1 1 220px', minWidth: '200px' },
  roomHeaderRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' },
  sheddedBadge: { fontSize: '9px', backgroundColor: '#7f1d1d', color: '#fca5a5', padding: '3px 6px', borderRadius: '4px', fontWeight: 'bold' },
  emergencyBadge: { fontSize: '9px', backgroundColor: '#14532d', color: '#4ade80', padding: '3px 6px', borderRadius: '4px', fontWeight: 'bold' },
  emergencyTagBadge: { fontSize: '9px', backgroundColor: '#7f1d1d', color: '#fca5a5', padding: '3px 6px', borderRadius: '4px', fontWeight: 'bold' },
  chiefGuestBadge: { fontSize: '9px', backgroundColor: '#ca8a04', color: '#fff', padding: '3px 6px', borderRadius: '4px', fontWeight: 'bold' },
  roomTitle: { margin: '4px 0', fontSize: '13px', fontWeight: 'bold', color: '#fff' },
  roomSub: { margin: 0, fontSize: '11px', color: '#94a3b8' },
  roomTitleSmall: { margin: '4px 0', fontSize: '11px', fontWeight: 'bold', color: '#fff' },
  roomSubSmall: { margin: 0, fontSize: '9px', color: '#94a3b8' },
  centerBookingWrapper: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' },
  bookingCardBox: { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '30px', width: '100%', maxWidth: '500px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' },
  formContainer: { display: 'flex', flexDirection: 'column', gap: '15px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '13px', color: '#94a3b8' },
  selectInput: { padding: '10px', borderRadius: '6px', backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' },
  textInput: { padding: '10px', borderRadius: '6px', backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' },
  checkboxGroup: { display: 'flex', alignItems: 'center', marginTop: '5px' },
  checkboxLabel: { fontSize: '13px', color: '#e2e8f0', display: 'flex', gap: '8px', cursor: 'pointer' },
  submitBtn: { backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
  logsBox: { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' },
  logItem: { backgroundColor: '#0f172a', padding: '10px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px', borderLeft: '3px solid #38bdf8' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContentLarge: { backgroundColor: '#1e293b', padding: '25px', borderRadius: '8px', border: '1px solid #334155', width: '90%', maxWidth: '750px', maxHeight: '85vh', overflowY: 'auto' },
  modalGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', margin: '15px 0' },
  modalColumnGreen: { backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #22c55e' },
  modalColumnRed: { backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #ef4444' },
  modalList: { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' },
  modalListItem: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px', backgroundColor: '#1e293b', borderRadius: '4px', borderBottom: '1px solid #334155' },
  algorithmLiveNote: { backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', fontSize: '12px', color: '#38bdf8', border: '1px solid #334155', marginBottom: '10px' },
  closeBtn: { backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%', marginTop: '10px' }
};
