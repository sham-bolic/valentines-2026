'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Image from 'next/image'

type GameState = 'menu' | 'hungry' | 'eating' | 'proposal'

const FOOD_EMOJIS = ['🍎', '🍕', '🍔', '🍰', '🍓', '🥐', '🍩', '🍪', '🥨', '🧁']

export default function Home() {
  const [state, setState] = useState<GameState>('menu')
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [showNomText, setShowNomText] = useState(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [eatenFood, setEatenFood] = useState<Set<string>>(new Set())
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Generate initial random positions, avoiding center where Dudu is
  const initialPositions = useMemo(() => {
    const generateRandomPosition = () => {
      let x: number, y: number
      const area = Math.random()
      if (area < 0.25) {
        x = 5 + Math.random() * 20; y = 5 + Math.random() * 20
      } else if (area < 0.5) {
        x = 75 + Math.random() * 20; y = 5 + Math.random() * 20
      } else if (area < 0.75) {
        x = 5 + Math.random() * 20; y = 75 + Math.random() * 20
      } else {
        x = 75 + Math.random() * 20; y = 75 + Math.random() * 20
      }
      return { x, y }
    }
    return {
      foodPositions: FOOD_EMOJIS.map(() => generateRandomPosition()),
      bubuPosition: generateRandomPosition(),
    }
  }, [])

  const [foodPositions, setFoodPositions] = useState(initialPositions.foodPositions)
  const [bubuPosition, setBubuPosition] = useState(initialPositions.bubuPosition)

  // Convert client coordinates to percentage position relative to container
  const clientToPercent = (clientX: number, clientY: number) => {
    if (!containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    return { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) }
  }

  const handleDragStart = (e: React.DragEvent, item: string) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', item)
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add('dragging')
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove('dragging')
    }
    setIsDraggingOver(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    
    // Check if dragging over Dudu's drop zone
    if (dropZoneRef.current) {
      const rect = dropZoneRef.current.getBoundingClientRect()
      const x = e.clientX
      const y = e.clientY
      
      const isOverDudu = 
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      
      setIsDraggingOver(isOverDudu)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Check if we're actually leaving the container or Dudu's drop zone
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setIsDraggingOver(false)
    } else if (dropZoneRef.current) {
      // Check if we're leaving Dudu's area specifically
      const rect = dropZoneRef.current.getBoundingClientRect()
      const x = e.clientX
      const y = e.clientY
      
      const isOverDudu = 
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      
      if (!isOverDudu) {
        setIsDraggingOver(false)
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
    
    const item = e.dataTransfer.getData('text/plain')
    const newPos = clientToPercent(e.clientX, e.clientY)
    
    // Check if drop is on Dudu specifically
    let isOverDudu = false
    if (dropZoneRef.current) {
      const rect = dropZoneRef.current.getBoundingClientRect()
      isOverDudu = 
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
    }
    
    if (item === 'bubu') {
      if (isOverDudu) {
        setState('eating')
      } else if (newPos) {
        setBubuPosition(newPos)
      }
    } else if (item && FOOD_EMOJIS.includes(item)) {
      if (isOverDudu) {
        // Food eaten by Dudu - disappear and show nom nom
        setShowNomText(true)
        setTimeout(() => setShowNomText(false), 1000)
        setEatenFood(prev => new Set(prev).add(item))
      } else if (newPos) {
        // Move food to drop position
        const foodIndex = FOOD_EMOJIS.indexOf(item)
        setFoodPositions(prev => {
          const updated = [...prev]
          updated[foodIndex] = newPos
          return updated
        })
      }
    }
    
    setDraggedItem(null)
  }

  // Auto-transition from eating to proposal after 3.5 seconds
  useEffect(() => {
    if (state === 'eating') {
      timeoutRef.current = setTimeout(() => {
        setState('proposal')
      }, 3500)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [state])

  // Touch event handlers for mobile support
  const handleTouchStart = (e: React.TouchEvent, item: string) => {
    setDraggedItem(item)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggedItem || !dropZoneRef.current) return
    
    const touch = e.touches[0]
    const dropZone = dropZoneRef.current.getBoundingClientRect()
    const touchX = touch.clientX
    const touchY = touch.clientY
    
    // Check if touch is over Dudu's drop zone
    const isOverDropZone = 
      touchX >= dropZone.left &&
      touchX <= dropZone.right &&
      touchY >= dropZone.top &&
      touchY <= dropZone.bottom
    
    setIsDraggingOver(isOverDropZone)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!draggedItem) {
      setDraggedItem(null)
      setIsDraggingOver(false)
      return
    }
    
    const touch = e.changedTouches[0]
    const newPos = clientToPercent(touch.clientX, touch.clientY)
    
    let isOverDropZone = false
    if (dropZoneRef.current) {
      const dropZone = dropZoneRef.current.getBoundingClientRect()
      isOverDropZone = 
        touch.clientX >= dropZone.left &&
        touch.clientX <= dropZone.right &&
        touch.clientY >= dropZone.top &&
        touch.clientY <= dropZone.bottom
    }
    
    if (draggedItem === 'bubu') {
      if (isOverDropZone) {
        setState('eating')
      } else if (newPos) {
        setBubuPosition(newPos)
      }
    } else if (FOOD_EMOJIS.includes(draggedItem)) {
      if (isOverDropZone) {
        setShowNomText(true)
        setTimeout(() => setShowNomText(false), 1000)
        setEatenFood(prev => new Set(prev).add(draggedItem))
      } else if (newPos) {
        const foodIndex = FOOD_EMOJIS.indexOf(draggedItem)
        setFoodPositions(prev => {
          const updated = [...prev]
          updated[foodIndex] = newPos
          return updated
        })
      }
    }
    
    setDraggedItem(null)
    setIsDraggingOver(false)
  }

  const getDuduImage = () => {
    switch (state) {
      case 'hungry':
        return '/hungry_dudu.png'
      case 'eating':
        return '/eating_dudu.png'
      case 'proposal':
        return '/flower_dudu.png'
      default:
        return '/hungry_dudu.png'
    }
  }

  if (state === 'menu') {
    return (
      <main className="container menu-screen">
        <div className="menu-content">
          <Image
            src="/hungry_dudu.png"
            alt="Hungry Dudu"
            width={200}
            height={200}
            className="menu-dudu"
            priority
            unoptimized
            style={{ background: 'transparent' }}
          />
          <h1 className="menu-title">Hungry Dudu</h1>
          <div className="menu-buttons">
            <button className="play-button" onClick={() => setState('hungry')}>
              Play
            </button>
            <button className="secondary-button" onClick={() => setShowHowToPlay(true)}>
              How to Play
            </button>
          </div>
        </div>

        {/* How to Play Modal */}
        {showHowToPlay && (
          <div className="modal-overlay" onClick={() => setShowHowToPlay(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2 className="modal-title">How to Play</h2>
              <ul className="modal-list">
                <li>Dudu will eat anything that is near him</li>
                <li>Drag and drop food near Dudu to feed him</li>
              </ul>
              <div className="modal-buttons">
                {!showHint ? (
                  <button className="hint-button" onClick={() => setShowHint(true)}>
                    Hint
                  </button>
                ) : (
                  <p className="modal-hint-text">Look around... maybe it&apos;s not food</p>
                )}
                <button className="modal-close" onClick={() => { setShowHowToPlay(false); setShowHint(false); }}>
                  Got it!
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    )
  }

  return (
    <main 
      ref={containerRef}
      className="container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Back button */}
      <button className="back-button" onClick={() => { setState('menu'); setEatenFood(new Set()); setShowNomText(false); }}>
        Back
      </button>

      {/* Dudu in the center, behind everything */}
      <div className="dudu-wrapper">
        <div
          ref={dropZoneRef}
          className={`drop-zone ${isDraggingOver ? 'drag-over' : ''}`}
        >
          <Image
            src={getDuduImage()}
            alt="Dudu"
            width={300}
            height={300}
            className="dudu-image"
            priority
            draggable={false}
            unoptimized
            style={{ background: 'transparent' }}
          />
        </div>
      </div>

      {/* Food items - positioned relative to the full container */}
      {state === 'hungry' && FOOD_EMOJIS.map((food, index) => {
        if (eatenFood.has(food)) return null
        const position = foodPositions[index]
        return (
          <div
            key={food}
            className="food-item"
            draggable
            onDragStart={(e) => handleDragStart(e, food)}
            onDragEnd={handleDragEnd}
            onTouchStart={(e) => handleTouchStart(e, food)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {food}
          </div>
        )
      })}

      {/* Bubu - positioned relative to the full container */}
      {state === 'hungry' && (
        <div
          className="bubu-container"
          draggable
          onDragStart={(e) => handleDragStart(e, 'bubu')}
          onDragEnd={handleDragEnd}
          onTouchStart={(e) => handleTouchStart(e, 'bubu')}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            left: `${bubuPosition.x}%`,
            top: `${bubuPosition.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <Image
            src="/bubu.png"
            alt="Bubu"
            width={60}
            height={60}
            className="bubu-image"
            draggable={false}
            unoptimized
            style={{ background: 'transparent' }}
          />
        </div>
      )}

      {/* "nom nom nom" text animation */}
      {showNomText && <div className="nom-text">nom nom nom</div>}

      {/* Eating state message */}
      {state === 'eating' && (
        <div className="message-container">
          <div className="message-text">
            Congrats! You found what Dudu wanted to eat most!
          </div>
        </div>
      )}

      {/* Proposal state */}
      {state === 'proposal' && (
        <div className="proposal-container">
          <div className="proposal-text">
            Will you be the Bubu to my Dudu, and be my Valentine? 💕
          </div>
        </div>
      )}
    </main>
  )
}
