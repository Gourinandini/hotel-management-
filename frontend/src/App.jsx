import { useState, useEffect } from 'react'
import axios from 'axios'
import './index.css'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, MapPin, Wifi, Coffee, Dumbbell, Waves, Wind, Calendar, Check, Search, ArrowLeft, X, Utensils, ConciergeBell, MessageCircle, Send, Sparkles } from 'lucide-react'

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
        history: chatMessages.slice(1) // exclude initial greeting from history sent to model
      })
      setChatMessages([...newHistory, { role: 'model', parts: [{ text: res.data.reply }] }])
    } catch (error) {
      console.error('Chat error', error)
      setChatMessages([...newHistory, { role: 'model', parts: [{ text: "I apologize, but I am having trouble connecting right now." }] }])
    } finally {
      setIsChatLoading(false)
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
      alert('Booking failed!')
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
            onClick={() => setView('search')}
          >
            Migrated Data Search (Mongo)
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
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>We bring you the world's most exquisite hotel experiences. Handpicked for quality, comfort, and breathtaking locations.</p>
                </div>
                
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid">
                  {hotels.map((hotel, idx) => (
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
                          <div className="price-tag">${room.price_per_night}<span style={{fontSize:'0.8rem', color:'var(--text-secondary)'}}>/nt</span></div>
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
                      <div><strong>Total Price:</strong> ${b.totalPrice}</div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
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
                ${selectedRoom.price_per_night} / night
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
                <div key={idx} className={`chat-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
                  {msg.parts[0].text}
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
