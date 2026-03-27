import { useState, useEffect } from 'react'
import axios from 'axios'
import './index.css'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, MapPin, Wifi, Coffee, Dumbbell, Waves, Wind, Calendar, Check, Search, ArrowLeft, X, Utensils, ConciergeBell, MessageCircle, Send, Sparkles, ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const API_BASE = 'http://localhost:3001/api'
const SEARCH_API = 'http://localhost:3002/api'

const hotelImages = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1542314831-c6a4d14d8376?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80'
];

const roomImages = [
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80'
];

const services = [
  { icon: <Waves size={24} />, title: 'Infinity Pool', desc: 'Temperature-controlled lap pool with ocean views.' },
  { icon: <Dumbbell size={24} />, title: 'Fitness Center', desc: 'State-of-the-art equipment and specialized fitness classes.' },
  { icon: <Wind size={24} />, title: 'Luxury Spa', desc: 'Holistic wellness therapies, massages, and a sauna.' },
  { icon: <Utensils size={24} />, title: 'Fine Dining', desc: 'Award-winning restaurants curated by Michelin-star chefs.' },
  { icon: <Coffee size={24} />, title: 'Café & Lounge', desc: 'Premium coffee blends, pastries, and a relaxing ambiance.' },
  { icon: <ConciergeBell size={24} />, title: '24/7 Concierge', desc: 'Personalized service to assist with all your requirements.' }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
}

function App() {
  const [view, setView] = useState('book') // 'book' or 'search'
  const [hotels, setHotels] = useState([])
  const [selectedHotel, setSelectedHotel] = useState(null)
  const [rooms, setRooms] = useState([])
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    start_date: '',
    end_date: ''
  })
  const [bookingSuccess, setBookingSuccess] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  // Itinerary Planner State
  const [itineraryForm, setItineraryForm] = useState({
    userPrompt: ''
  })
  const [itineraryResult, setItineraryResult] = useState(null)
  const [isPlanning, setIsPlanning] = useState(false)

  // Booking Page Search
  const [locationSearchQuery, setLocationSearchQuery] = useState('')

  // Chatbot State
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([{ role: 'model', parts: [{ text: "Hello! I am Aura, your premium concierge. How can I assist you with your stay today?" }] }])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)

  const handleChatSubmit = async (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const userMsg = { role: 'user', parts: [{ text: chatInput }] }
    const newHistory = [...chatMessages, userMsg]
    setChatMessages(newHistory)
    setChatInput('')
    setIsChatLoading(true)

    try {
      const res = await axios.post(`${API_BASE}/chat`, {
        message: chatInput,
        history: chatMessages.slice(1).map(m => ({
          role: m.role,
          parts: m.parts
        }))
      })
      
      const aiReply = { 
        role: 'model', 
        parts: [{ text: res.data.reply }],
        isItinerary: res.data.isItinerary,
        userPrompt: chatInput // Store the original prompt to use for the assistant
      }
      setChatMessages([...newHistory, aiReply])
    } catch (error) {
      console.error('Chat error', error)
      setChatMessages([...newHistory, { role: 'model', parts: [{ text: "I apologize, but I am having trouble connecting right now." }] }])
    } finally {
      setIsChatLoading(false)
    }
  }

  const handleItinerarySubmit = async (e) => {
    e.preventDefault()
    
    if (!itineraryForm.userPrompt.trim()) return;

    setIsPlanning(true)
    setItineraryResult(null)
    try {
      const res = await axios.post(`${API_BASE}/itinerary`, { userPrompt: itineraryForm.userPrompt })
      // res.data has { structured, itinerary } — store the whole object
      setItineraryResult(res.data)
    } catch (error) {
      console.error('Itinerary planning failed', error)
      const errorMsg = error.response?.data?.error || 'Failed to generate your itinerary. Please ensure the backend is running and the GROQ_API_KEY is set.'
      setItineraryResult({ structured: null, itinerary: errorMsg })
    } finally {
      setIsPlanning(false)
    }
  }

  useEffect(() => {
    fetchHotels()
  }, [])

  const fetchHotels = async () => {
    try {
      const res = await axios.get(`${API_BASE}/hotels`)
      setHotels(res.data)
    } catch (error) {
      console.error('Error fetching hotels:', error)
    }
  }

  const handleHotelClick = async (hotel) => {
    setSelectedHotel(hotel)
    try {
      const res = await axios.get(`${API_BASE}/hotels/${hotel.id}/rooms`)
      setRooms(res.data)
    } catch (error) {
      console.error('Error fetching rooms:', error)
    }
  }

  const openBooking = (room) => {
    setSelectedRoom(room)
    setBookingModalOpen(true)
    setBookingSuccess(false)
  }

  const handleBook = async (e) => {
    e.preventDefault()
    const start = new Date(formData.start_date)
    const end = new Date(formData.end_date)
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    const totalPrice = days > 0 ? days * selectedRoom.price_per_night : selectedRoom.price_per_night

    try {
      await axios.post(`${API_BASE}/bookings`, {
        hotel_id: selectedHotel.id,
        room_id: selectedRoom.id,
        ...formData,
        total_price: totalPrice
      })
      setBookingSuccess(true)
      setTimeout(() => {
        setBookingModalOpen(false)
        setFormData({ customer_name: '', customer_email: '', start_date: '', end_date: '' })
      }, 2000)
    } catch (error) {
      console.error('Booking failed', error)
      const msg = error.response?.data?.error || 'Booking failed!'
      alert(msg)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    setIsSearching(true)
    try {
      const res = await axios.get(`${SEARCH_API}/search?name=${searchQuery}`)
      setSearchResults(res.data)
    } catch (error) {
      console.error('Search failed', error)
      alert('Search API might not be running (Port 3002)')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="main-title">Premium Stays</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className={`auto-width ${view === 'book' ? '' : 'outline'}`}
            onClick={() => { setView('book'); setSelectedHotel(null); }}
          >
            Booking App (Pg)
          </button>
          <button 
            className={`auto-width ${view === 'search' ? 'success' : 'success-outline'}`}
            onClick={() => { setView('search'); setSelectedHotel(null); }}
          >
            Migrated Data (Mongo)
          </button>
          <button 
            className={`auto-width ${view === 'itinerary' ? '' : 'outline'}`}
            onClick={() => { setView('itinerary'); setSelectedHotel(null); }}
            style={{borderColor: 'var(--accent)', color: view === 'itinerary' ? '#fff' : 'var(--accent)', background: view === 'itinerary' ? 'var(--accent)' : 'transparent'}}
          >
            <Sparkles size={16} style={{marginRight: '6px', verticalAlign: 'middle', display: 'inline-block'}}/> AI Travel Assistant
          </button>
        </div>
      </div>
      
      <AnimatePresence mode="wait">
        {view === 'book' && (
          <motion.div key="book" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            {!selectedHotel ? (
              <>
                <div style={{ marginBottom: '3rem' }}>
                  <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Discover Unmatched Luxury</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '1.5rem' }}>We bring you the world's most exquisite hotel experiences. Handpicked for quality, comfort, and breathtaking locations.</p>
                  <input 
                    type="text" 
                    placeholder="Search by hotel name or location (e.g., Beachfront, New York)..." 
                    value={locationSearchQuery} 
                    onChange={e => setLocationSearchQuery(e.target.value)} 
                  />
                </div>
                
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid">
                  {hotels.filter(h => h.location.toLowerCase().includes(locationSearchQuery.toLowerCase()) || h.name.toLowerCase().includes(locationSearchQuery.toLowerCase())).map((hotel, idx) => (
                    <motion.div key={hotel.id} variants={itemVariants} className="card" onClick={() => handleHotelClick(hotel)}>
                      <div className="card-image-wrapper">
                        <img src={hotelImages[idx % hotelImages.length]} alt={hotel.name} className="card-image" />
                        <div className="rating-badge"><Star size={14} style={{ marginRight: '4px' }} fill="currentColor" /> {hotel.rating}</div>
                      </div>
                      <div className="card-content">
                        <h3>{hotel.name}</h3>
                        <p className="location"><MapPin size={16} /> {hotel.location}</p>
                        <p className="hotel-desc">Experience standard-setting luxury and serene surroundings right in the heart of {hotel.location}. Enjoy bespoke services designed to elevate your stay.</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                <div className="services-container" style={{ marginTop: '5rem', marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '2.5rem' }}>Our Signature Services</h2>
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="services-grid">
                    {services.map((svc, i) => (
                      <motion.div key={i} variants={itemVariants} className="service-card">
                        <div className="service-icon">{svc.icon}</div>
                        <h4>{svc.title}</h4>
                        <p>{svc.desc}</p>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </>
            ) : (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <button className="outline auto-width" style={{marginBottom: '2rem'}} onClick={() => setSelectedHotel(null)}>
                  <ArrowLeft size={16} style={{marginRight: '8px', display: 'inline-block', verticalAlign: 'middle'}}/> Back to Hotels
                </button>
                <div style={{marginBottom: '2rem'}}>
                  <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{selectedHotel.name}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}><MapPin size={18} style={{marginRight:'4px', display:'inline-block'}} /> {selectedHotel.location} · {selectedHotel.rating} Stars</p>
                </div>
                
                <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '1rem' }}>Available Rooms</h3>
                
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid">
                  {rooms.map((room, idx) => (
                    <motion.div key={room.id} variants={itemVariants} className="card">
                      <div className="card-image-wrapper" style={{ height: '180px' }}>
                         <img src={roomImages[idx % roomImages.length]} alt={`Room ${room.room_number}`} className="card-image" />
                      </div>
                      <div className="card-content">
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                          <h3>{room.type} Suite</h3>
                          <div className="price-tag">₹{room.price_per_night}<span style={{fontSize:'0.8rem', color:'var(--text-secondary)'}}>/nt</span></div>
                        </div>
                        <p style={{marginTop:'0', color:'var(--text-secondary)'}}>Room #{room.room_number}</p>
                        
                        <div className="amenities-list">
                          <span><Wifi size={14}/> Fast WiFi</span>
                          <span><Coffee size={14}/> Minibar</span>
                          <span><Star size={14}/> Premium</span>
                        </div>
                        
                        <button style={{marginTop: 'auto', paddingTop: '0.75rem', paddingBottom: '0.75rem'}} onClick={() => openBooking(room)}>
                          Reserve Room
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        )}

        {view === 'search' && (
          <motion.div key="search" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="search-panel">
            <h2 style={{color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Search size={28}/> Search Migrated Records</h2>
            <p style={{color: 'var(--text-secondary)', marginBottom: '2.5rem'}}>
              Access data securely migrated to our MongoDB cluster. Search instantly by customer name.
            </p>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
              <input 
                type="text" 
                placeholder="Search by Customer Name (e.g., John)..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ marginBottom: 0, flex: 1 }}
              />
              <button type="submit" className="success auto-width" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <Search size={18}/> {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>

            <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {searchResults.length === 0 ? (
                <p style={{textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 0', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1'}}>
                  No results found. Hit search to view all migrated data!
                </p>
              ) : (
                searchResults.map((b, idx) => (
                  <motion.div variants={itemVariants} key={b._id} className="search-result">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                      <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{b.customer.name}</strong>
                      <span className={b.cdcSynced ? 'badge-synced' : 'badge-migrated'}>
                        {b.cdcSynced ? 'CDC Synced' : 'Migrated Chunk'}
                      </span>
                    </div>
                    <div className="search-grid">
                      <div><strong style={{display: 'inline-flex', alignItems:'center', gap:'4px'}}><MapPin size={14}/> Hotel:</strong> {b.hotel.name} ({b.hotel.location})</div>
                      <div><strong>Email:</strong> {b.customer.email}</div>
                      <div><strong style={{display: 'inline-flex', alignItems:'center', gap:'4px'}}><Calendar size={14}/> Dates:</strong> {new Date(b.dates.start).toLocaleDateString()} - {new Date(b.dates.end).toLocaleDateString()}</div>
                      <div><strong>Total Price:</strong> ₹{b.totalPrice}</div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          </motion.div>
        )}

        {view === 'itinerary' && (
          <motion.div key="itinerary" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="search-panel">
            <h2 style={{color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Sparkles size={28}/> AI Travel Assistant</h2>
            <p style={{color: 'var(--text-secondary)', marginBottom: '2.5rem'}}>
              Tell me your starting point, destination, and number of days — I'll plan the perfect trip with real hotel bookings!
            </p>
            <form onSubmit={handleItinerarySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
              <textarea 
                placeholder="e.g. 'I'm starting from Kochi, going to Munnar for 3 days'" 
                value={itineraryForm.userPrompt} 
                onChange={e => setItineraryForm({userPrompt: e.target.value})}
                style={{
                  width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff', fontSize: '1.1rem', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit'
                }}
              />
              <button type="submit" className="success" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', alignSelf: 'flex-start', padding: '1rem 2rem', fontSize: '1.1rem'}}>
                <Sparkles size={18}/> {isPlanning ? 'Planning Itinerary...' : 'Generate Itinerary'}
              </button>
            </form>

            {/* Structured Day-Wise Itinerary */}
            {itineraryResult && itineraryResult.structured && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Summary Header */}
                <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', padding: '1.5rem 2rem', borderRadius: '16px 16px 0 0', marginBottom: 0 }}>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '1.3rem' }}>
                    📍 {itineraryResult.structured.startingLocation} → {itineraryResult.structured.destination}
                  </h3>
                  <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '1rem' }}>
                    {itineraryResult.structured.summary}
                  </p>
                </div>

                {/* Day Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {itineraryResult.structured.days.map((day, idx) => (
                    <div key={idx} style={{ 
                      background: '#fff', border: '1px solid #e2e8f0', borderTop: 'none',
                      padding: '1.5rem 2rem',
                      borderRadius: idx === itineraryResult.structured.days.length - 1 ? '0 0 16px 16px' : '0'
                    }}>
                      <h3 style={{ color: 'var(--accent)', margin: '0 0 1rem 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={18}/> {day.title}
                      </h3>
                      
                      {/* Attractions with Google Maps Links */}
                      {day.attractions && day.attractions.length > 0 && (
                        <div style={{ marginBottom: '1rem' }}>
                          <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Attractions</strong>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {day.attractions.map((attr, i) => (
                              <div key={i} className="attraction-item">
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                                  <MapPin size={16} style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }} />
                                  <div>
                                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{attr.name}</strong>
                                    {attr.description && <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{attr.description}</p>}
                                  </div>
                                </div>
                                {attr.googleMapsUrl && (
                                  <a href={attr.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="maps-link">
                                    <ExternalLink size={13} /> Maps
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fallback: old-style activities (string array) */}
                      {(!day.attractions || day.attractions.length === 0) && day.activities && (
                        <div style={{ marginBottom: '1rem' }}>
                          <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Activities</strong>
                          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem' }}>
                            {day.activities.map((act, i) => (
                              <li key={i} style={{ marginBottom: '0.3rem', color: 'var(--text-primary)' }}>{act}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Local Tip */}
                      {day.localTip && (
                        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.95rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <span>💡</span>
                          <span><strong>Pro Tip:</strong> {day.localTip}</span>
                        </div>
                      )}

                      {/* 3-Tier Hotel Recommendations */}
                      {day.hotels && (
                        <div>
                          <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.6rem' }}>Hotel Recommendations</strong>
                          <div className="tier-grid">
                            {['budget', 'medium', 'luxury'].map(tier => {
                              const hotel = day.hotels[tier];
                              const tierConfig = {
                                budget: { label: '💰 Budget', bg: '#ecfdf5', border: '#a7f3d0', badge: '#065f46', badgeBg: '#d1fae5' },
                                medium: { label: '⭐ Medium', bg: '#eff6ff', border: '#bfdbfe', badge: '#1e40af', badgeBg: '#dbeafe' },
                                luxury: { label: '👑 Luxury', bg: '#fefce8', border: '#fde68a', badge: '#92400e', badgeBg: '#fef3c7' }
                              }[tier];
                              
                              return (
                                <div key={tier} className="tier-hotel-card" style={{ background: tierConfig.bg, borderColor: tierConfig.border }}>
                                  <span className="tier-badge" style={{ background: tierConfig.badgeBg, color: tierConfig.badge }}>
                                    {tierConfig.label}
                                  </span>
                                  {hotel ? (
                                    <>
                                      <div style={{ marginTop: '0.5rem' }}>
                                        <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--text-primary)' }}>{hotel.hotel_name}</strong>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                          <MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }}/> {hotel.location}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                                          {hotel.room_type} · Room #{hotel.room_number}
                                          {' · '}<Star size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} fill="#d97706" color="#d97706"/> {hotel.rating}
                                        </div>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.6rem', gap: '0.5rem' }}>
                                        <div>
                                          <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent)' }}>₹{hotel.price_per_night}</span>
                                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>/night</span>
                                        </div>
                                        <span style={{ 
                                          background: hotel.available ? '#d1fae5' : '#fee2e2', 
                                          color: hotel.available ? '#065f46' : '#991b1b',
                                          padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600
                                        }}>
                                          {hotel.available ? '✓ Available' : '✗ Booked'}
                                        </span>
                                      </div>
                                      <button 
                                        className="auto-width" 
                                        style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', marginTop: '0.5rem', width: '100%' }}
                                        onClick={() => {
                                          const matchedHotel = hotels.find(h => h.id === hotel.hotel_id) || { id: hotel.hotel_id, name: hotel.hotel_name, location: hotel.location, rating: hotel.rating };
                                          setSelectedHotel(matchedHotel);
                                          setSelectedRoom({ id: hotel.room_id, room_number: hotel.room_number, type: hotel.room_type, price_per_night: hotel.price_per_night });
                                          setBookingModalOpen(true);
                                          setBookingSuccess(false);
                                        }}
                                      >
                                        Book Now
                                      </button>
                                      {hotel.googleMapsUrl && (
                                        <a 
                                          href={hotel.googleMapsUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="maps-link"
                                          style={{ 
                                            display: 'block', textAlign: 'center', fontSize: '0.75rem', marginTop: '0.4rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600
                                          }}
                                        >
                                          <MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }}/> View on Maps
                                        </a>
                                      )}
                                    </>
                                  ) : (
                                    <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No {tier} options available in this area</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Fallback: old single hotel card */}
                      {!day.hotels && day.hotel && (
                        <div style={{ 
                          background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', 
                          padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
                        }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                              <strong style={{ fontSize: '1.05rem' }}>{day.hotel.hotel_name}</strong>
                              <span style={{ 
                                background: day.hotel.available ? '#d1fae5' : '#fee2e2', 
                                color: day.hotel.available ? '#065f46' : '#991b1b',
                                padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600
                              }}>
                                {day.hotel.available ? '✓ Available' : '✗ Booked'}
                              </span>
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                              <MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}/> {day.hotel.location}
                              {' · '}{day.hotel.room_type} · Room #{day.hotel.room_number}
                              {' · '}<Star size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} fill="#d97706" color="#d97706"/> {day.hotel.rating}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent)' }}>₹{day.hotel.price_per_night}<span style={{fontSize:'0.8rem', fontWeight: 400, color:'var(--text-secondary)'}}>/ night</span></span>
                            <button 
                              className="auto-width" 
                              style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
                              onClick={() => {
                                const matchedHotel = hotels.find(h => h.id === day.hotel.hotel_id) || { id: day.hotel.hotel_id, name: day.hotel.hotel_name, location: day.hotel.location, rating: day.hotel.rating };
                                setSelectedHotel(matchedHotel);
                                setSelectedRoom({ id: day.hotel.room_id, room_number: day.hotel.room_number, type: day.hotel.room_type, price_per_night: day.hotel.price_per_night });
                                setBookingModalOpen(true);
                                setBookingSuccess(false);
                              }}
                            >
                              Book Now
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Book All Prompt */}
                <div style={{ textAlign: 'center', marginTop: '1.5rem', padding: '1rem', background: '#f1f5f9', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                    🎉 <strong>Would you like to book this itinerary?</strong> Click "Book Now" on any hotel above to reserve your room!
                  </p>
                  <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem', opacity: 0.8 }}>
                    Note: "View on Maps" links use the Google Maps Search API and do not require a separate client-side API key.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Fallback: plain markdown if structured parse failed */}
            {itineraryResult && !itineraryResult.structured && itineraryResult.itinerary && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#f8fafc', padding: '2rem', borderRadius: '12px', border: '1px solid #cbd5e1', lineHeight: '1.6', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem'}}><MapPin size={20}/> Your Custom Itinerary</h3>
                <div className="itinerary-content">
                  <ReactMarkdown>{itineraryResult.itinerary}</ReactMarkdown>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bookingModalOpen && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
            >
              <button className="close-btn" onClick={() => setBookingModalOpen(false)}><X size={20}/></button>
              <h2 style={{marginTop: 0}}>Reserve {selectedRoom.type} Suite</h2>
              <p style={{fontSize: '1.1rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '2rem'}}>
                ₹{selectedRoom.price_per_night} / night
              </p>
              
              {bookingSuccess ? (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="success-message">
                  <Check size={48} style={{margin: '0 auto 1rem auto', display: 'block'}} />
                  <div style={{fontSize: '1.2rem', marginBottom: '0.5rem'}}>Booking Confirmed!</div>
                  <div style={{fontSize: '0.9rem', color: '#047857'}}>Your luxury stay is reserved.</div>
                </motion.div>
              ) : (
                <form onSubmit={handleBook}>
                  <input type="text" placeholder="Full Name" required value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} />
                  <input type="email" placeholder="Email Address" required value={formData.customer_email} onChange={e => setFormData({...formData, customer_email: e.target.value})} />
                  <label style={{display: 'block', marginBottom: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500}}>Check-in Date</label>
                  <input type="date" required value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                  <label style={{display: 'block', marginBottom: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500}}>Check-out Date</label>
                  <input type="date" required value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
                  
                  {/* Dynamic Total Cost */}
                  {formData.start_date && formData.end_date && (() => {
                    const start = new Date(formData.start_date)
                    const end = new Date(formData.end_date)
                    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
                    if (nights <= 0) return (
                      <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.9rem', color: '#991b1b', fontWeight: 500 }}>
                        ⚠ Check-out date must be after check-in date
                      </div>
                    )
                    const total = nights * selectedRoom.price_per_night
                    return (
                      <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.9rem', color: '#065f46' }}>
                            {nights} night{nights > 1 ? 's' : ''} × ₹{selectedRoom.price_per_night}
                          </span>
                          <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#059669' }}>
                            Total: ₹{total.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )
                  })()}

                  <button type="submit" style={{marginTop: '1rem'}}>Confirm Reservation</button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Chatbot Toggle Button */}
      {!chatOpen && (
        <button className="chatbot-toggle" onClick={() => setChatOpen(true)}>
          <MessageCircle size={28} />
        </button>
      )}

      {/* AI Chatbot Window */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div 
            className="chatbot-window"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
          >
            <div className="chatbot-header">
              <h3><Sparkles size={18} /> Concierge Aura</h3>
              <button className="close-btn" style={{position:'static', width:'30px', height:'30px', background:'transparent', color:'white', boxShadow:'none'}} onClick={() => setChatOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="chatbot-messages">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`chat-bubble ${msg.role === 'user' ? 'user' : 'ai'}`} style={{ position: 'relative' }}>
                  {msg.parts[0].text}
                  {msg.isItinerary && (
                    <div style={{ marginTop: '10px' }}>
                      <button 
                        className="success" 
                        style={{ padding: '6px 12px', fontSize: '0.85rem', width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => {
                          setView('itinerary');
                          setItineraryForm({ userPrompt: msg.userPrompt || '' });
                          setChatOpen(false);
                          // Optional: automatically trigger the planning?
                          // handleItinerarySubmit({ preventDefault: () => {} });
                        }}
                      >
                        <Sparkles size={14} /> Book Now (Plan Trip)
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {isChatLoading && (
                <div className="chat-bubble ai">
                  <div className="typing-indicator" style={{fontStyle:'italic', color:'#6b7280'}}>Typing...</div>
                </div>
              )}
            </div>
            <form className="chatbot-input" onSubmit={handleChatSubmit}>
              <input 
                type="text" 
                placeholder="Ask Aura anything..." 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                disabled={isChatLoading}
              />
              <button type="submit" className="success" disabled={isChatLoading || !chatInput.trim()}>
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default App
