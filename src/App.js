import React, {
  Component,
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSkull,
  faHeart,
  faArrowUp,
  faBars,
  faTimes,
  faCog,
} from "@fortawesome/free-solid-svg-icons";

// Custom Button component to reduce repetition
const Button = ({
  children,
  onClick,
  variant = "default",
  className = "",
  ...props
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`app-button ${
      variant !== "default" ? variant : ""
    } ${className}`.trim()}
    {...props}
  >
    {children}
  </button>
);

// Calculate background color based on stage
const getCellBackgroundColor = (
  stage,
  numCellStages,
  colorScheme = "greyscale"
) => {
  // Handle edge case where numCellStages is 1
  if (numCellStages === 1) {
    return "#FFFFFF";
  }

  if (colorScheme === "greyscale") {
    // Original greyscale mode
    // Calculate color value (0-255) interpolating from white (255) to black (0)
    const colorValue = Math.round(255 * (1 - stage / (numCellStages - 1)));

    // Convert to hex color
    const hexValue = colorValue.toString(16).padStart(2, "0");
    return `#${hexValue}${hexValue}${hexValue}`;
  } else {
    // Gradient mode - parse the colorScheme to get start and end colors
    const gradients = {
      "blue-purple": { start: "#E3F2FD", end: "#4A148C" }, // Light blue to deep purple
      "green-blue": { start: "#E8F5E8", end: "#1A237E" }, // Light green to deep blue
      "orange-red": { start: "#FFF3E0", end: "#B71C1C" }, // Light orange to deep red
      "purple-pink": { start: "#F3E5F5", end: "#880E4F" }, // Light purple to deep pink
      "teal-navy": { start: "#E0F2F1", end: "#0D47A1" }, // Light teal to navy
    };

    // Default to blue-purple if scheme not found
    const colors = gradients[colorScheme] || gradients["blue-purple"];

    return interpolateColor(
      colors.start,
      colors.end,
      stage / (numCellStages - 1)
    );
  }
};

// Linear interpolation between two hex colors
const interpolateColor = (startColor, endColor, factor) => {
  // Parse hex colors
  const parseHex = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };

  const start = parseHex(startColor);
  const end = parseHex(endColor);

  // Interpolate each component
  const r = Math.round(start.r + (end.r - start.r) * factor);
  const g = Math.round(start.g + (end.g - start.g) * factor);
  const b = Math.round(start.b + (end.b - start.b) * factor);

  // Convert back to hex
  const toHex = (value) => value.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Initialize our 2D array of cells
const createCells = (rows, cols) => {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    cells[r] = [];
    for (let c = 0; c < cols; c++) {
      cells[r][c] = {
        row: r,
        col: c,
        stage: 0,
        neighbours: 0,
      };
    }
  }

  return cells;
};

// Initialize rules for each stage and neighbor count
const createRules = () => {
  const rules = [];
  const MAX_STAGES = 8; // Always create rules for 8 stages

  for (let stage = 0; stage < MAX_STAGES; stage++) {
    rules[stage] = [];
    for (let neighbors = 0; neighbors <= 8; neighbors++) {
      if (stage === 0) {
        // Stage 0 (dead cells): Classic GoL birth rule - exactly 3 neighbors
        rules[stage][neighbors] = neighbors === 3 ? "evolve" : "die";
      } else if (stage === MAX_STAGES - 1) {
        // Final stage (stage 7): Classic GoL survival rule - 2 or 3 neighbors
        rules[stage][neighbors] =
          neighbors === 2 || neighbors === 3 ? "survive" : "die";
      } else if (stage === 1) {
        // Stage 1: special rules - 3 neighbors evolve, 4 neighbors die
        if (neighbors === 2) {
          rules[stage][neighbors] = "survive";
        } else if (neighbors === 3) {
          rules[stage][neighbors] = "evolve";
        } else if (neighbors === 4) {
          rules[stage][neighbors] = "die";
        } else {
          rules[stage][neighbors] = "die";
        }
      } else {
        // Middle stages (2-6): default to survive for 2-3 neighbors, evolve for others
        if (neighbors === 2 || neighbors === 3) {
          rules[stage][neighbors] = "survive";
        } else if (neighbors === 4) {
          rules[stage][neighbors] = "evolve";
        } else {
          rules[stage][neighbors] = "die";
        }
      }
    }
  }
  return rules;
};

// Instructions overlay component
const InstructionsOverlay = ({ onHide }) => {
  // Detect if device is mobile
  const isMobile = "ontouchstart" in window || window.innerWidth < 768;

  const instructionText = isMobile
    ? "Tap and drag to draw cells, then press Start"
    : "Click and drag over the grid, then click Start";

  const controlsText = isMobile
    ? "🔍 Pinch to zoom • ✋ Two fingers to pan • 🎨 One finger to draw"
    : "🔍 Mouse wheel to zoom • 🖱️ Right-click drag to pan • 🎨 Left-click drag to draw";

  return (
    <div
      className="instructions-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        pointerEvents: "none", // Allow clicks to pass through to the grid
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          textAlign: "center",
          maxWidth: "400px",
          margin: "1rem",
          border: "2px solid #333",
        }}
      >
        {/* <img
          src="/assets/intro_graphic_transparent.png"
          alt="Game of Life: Evolved"
          style={{
            width: "120px",
            height: "auto",
            marginBottom: "1rem",
            display: "block",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        /> */}
        <h3
          style={{
            margin: "0 0 1rem 0",
            color: "#333",
            fontSize: "1.2rem",
          }}
        >
          Welcome to Game of Life: Evolved!
        </h3>
        <p
          style={{
            margin: "0 0 1rem 0",
            color: "#666",
            fontSize: "1rem",
            lineHeight: "1.4",
          }}
        >
          {instructionText}
        </p>
        <p
          style={{
            margin: "0 0 1rem 0",
            color: "#555",
            fontSize: "0.85rem",
            lineHeight: "1.3",
            fontFamily: "monospace",
            backgroundColor: "#f5f5f5",
            padding: "0.5rem",
            borderRadius: "4px",
          }}
        >
          {controlsText}
        </p>
        <p
          style={{
            margin: 0,
            color: "#666",
            fontSize: "0.9rem",
            lineHeight: "1.4",
            fontStyle: "italic",
          }}
        >
          💡 Check out the sidebar for customization options: cell stages,
          rules, colors, speed, and more!
        </p>
      </div>
    </div>
  );
};

// Canvas-based Grid component for better performance and drag support
const Grid = ({
  cells,
  onCellClick,
  numCellStages,
  rows,
  cols,
  cellSize,
  zoom,
  panX,
  panY,
  onZoomChange,
  onPanChange,
  colorScheme,
  onFirstInteraction, // New prop for hiding instructions
}) => {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastDraggedCell, setLastDraggedCell] = useState(null);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Touch state for mobile gestures
  const [touchState, setTouchState] = useState({
    isMultiTouch: false,
    lastDistance: 0,
    lastCenter: { x: 0, y: 0 },
  });

  // Get cell coordinates from mouse position
  const getCellFromMousePos = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Transform mouse coordinates to grid coordinates
      // Account for pan and zoom
      const x = (mouseX - panX) / zoom;
      const y = (mouseY - panY) / zoom;

      const col = Math.floor(x / cellSize);
      const row = Math.floor(y / cellSize);

      if (row >= 0 && row < rows && col >= 0 && col < cols) {
        return { row, col };
      }
      return null;
    },
    [cellSize, zoom, panX, panY, rows, cols]
  );

  // Handle cell interaction (click or drag)
  const handleCellInteraction = useCallback(
    (e) => {
      const cellPos = getCellFromMousePos(e);
      if (cellPos) {
        const { row, col } = cellPos;
        const cellKey = `${row},${col}`;

        // Only trigger if we haven't already dragged over this cell
        if (!isDragging || lastDraggedCell !== cellKey) {
          onCellClick(cells[row][col]);
          setLastDraggedCell(cellKey);

          // Call onFirstInteraction to hide instructions
          if (onFirstInteraction) {
            onFirstInteraction();
          }
        }
      }
    },
    [
      getCellFromMousePos,
      isDragging,
      lastDraggedCell,
      onCellClick,
      cells,
      onFirstInteraction,
    ]
  );

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setLastMousePos({ x: mouseX, y: mouseY });

      if (e.button === 2) {
        // Right click - start panning
        e.preventDefault();
        setIsPanning(true);
      } else if (e.button === 0) {
        // Left click - start cell interaction
        setIsDragging(true);
        setLastDraggedCell(null);
        handleCellInteraction(e);
      }
    },
    [handleCellInteraction]
  );

  const handleMouseMove = useCallback(
    (e) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (isPanning && onPanChange) {
        // Pan the view
        const deltaX = mouseX - lastMousePos.x;
        const deltaY = mouseY - lastMousePos.y;
        onPanChange(panX + deltaX, panY + deltaY);
      } else if (isDragging) {
        // Draw cells
        handleCellInteraction(e);
      }

      setLastMousePos({ x: mouseX, y: mouseY });
    },
    [
      isDragging,
      isPanning,
      handleCellInteraction,
      lastMousePos,
      panX,
      panY,
      onPanChange,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsPanning(false);
    setLastDraggedCell(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setIsPanning(false);
    setLastDraggedCell(null);
  }, []);

  // Helper functions for touch gestures
  const getTouchDistance = useCallback((touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getTouchCenter = useCallback((touch1, touch2, rect) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2 - rect.left,
      y: (touch1.clientY + touch2.clientY) / 2 - rect.top,
    };
  }, []);

  // Touch event handlers for mobile support
  const handleTouchStart = useCallback(
    (e) => {
      e.preventDefault(); // Prevent scrolling
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (e.touches.length === 1) {
        // Single touch - cell interaction
        const touch = e.touches[0];
        const mouseEvent = {
          clientX: touch.clientX,
          clientY: touch.clientY,
        };
        setIsDragging(true);
        setLastDraggedCell(null);
        setTouchState({
          isMultiTouch: false,
          lastDistance: 0,
          lastCenter: { x: 0, y: 0 },
        });
        handleCellInteraction(mouseEvent);
      } else if (e.touches.length === 2) {
        // Two finger touch - prepare for zoom/pan
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = getTouchDistance(touch1, touch2);
        const center = getTouchCenter(touch1, touch2, rect);

        setIsDragging(false); // Stop cell interaction
        setTouchState({
          isMultiTouch: true,
          lastDistance: distance,
          lastCenter: center,
        });
      }
    },
    [handleCellInteraction, getTouchDistance, getTouchCenter]
  );

  const handleTouchMove = useCallback(
    (e) => {
      e.preventDefault(); // Prevent scrolling
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (e.touches.length === 1 && isDragging && !touchState.isMultiTouch) {
        // Single finger drag - continue cell interaction
        const touch = e.touches[0];
        const mouseEvent = {
          clientX: touch.clientX,
          clientY: touch.clientY,
        };
        handleCellInteraction(mouseEvent);
      } else if (e.touches.length === 2 && touchState.isMultiTouch) {
        // Two finger gesture - zoom and/or pan
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = getTouchDistance(touch1, touch2);
        const currentCenter = getTouchCenter(touch1, touch2, rect);

        if (touchState.lastDistance > 0) {
          // Handle pinch zoom
          const zoomFactor = currentDistance / touchState.lastDistance;
          const newZoom = Math.max(1.0, Math.min(10, zoom * zoomFactor));

          if (onZoomChange && Math.abs(zoomFactor - 1) > 0.01) {
            // Calculate zoom point (center of pinch)
            const zoomPointX = (touchState.lastCenter.x - panX) / zoom;
            const zoomPointY = (touchState.lastCenter.y - panY) / zoom;

            const newPanX = touchState.lastCenter.x - zoomPointX * newZoom;
            const newPanY = touchState.lastCenter.y - zoomPointY * newZoom;

            onZoomChange(newZoom);
            if (onPanChange) {
              onPanChange(newPanX, newPanY);
            }
          }

          // Handle two-finger pan (even during zoom)
          if (onPanChange) {
            const panDeltaX = currentCenter.x - touchState.lastCenter.x;
            const panDeltaY = currentCenter.y - touchState.lastCenter.y;

            // Only apply pan if there's significant movement
            if (Math.abs(panDeltaX) > 2 || Math.abs(panDeltaY) > 2) {
              onPanChange(panX + panDeltaX, panY + panDeltaY);
            }
          }
        }

        // Update touch state
        setTouchState({
          isMultiTouch: true,
          lastDistance: currentDistance,
          lastCenter: currentCenter,
        });
      }
    },
    [
      isDragging,
      touchState,
      handleCellInteraction,
      getTouchDistance,
      getTouchCenter,
      zoom,
      panX,
      panY,
      onZoomChange,
      onPanChange,
    ]
  );

  const handleTouchEnd = useCallback(
    (e) => {
      e.preventDefault();

      if (e.touches.length === 0) {
        // All fingers lifted
        setIsDragging(false);
        setLastDraggedCell(null);
        setTouchState({
          isMultiTouch: false,
          lastDistance: 0,
          lastCenter: { x: 0, y: 0 },
        });
      } else if (e.touches.length === 1 && touchState.isMultiTouch) {
        // Went from two fingers to one - switch back to cell interaction
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const touch = e.touches[0];
          const mouseEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
          };
          setIsDragging(true);
          setLastDraggedCell(null);
          setTouchState({
            isMultiTouch: false,
            lastDistance: 0,
            lastCenter: { x: 0, y: 0 },
          });
          handleCellInteraction(mouseEvent);
        }
      }
    },
    [touchState.isMultiTouch, handleCellInteraction]
  );

  // Mouse wheel handler for zooming
  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Zoom factor
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(1.0, Math.min(10, zoom * zoomFactor));

      if (onZoomChange && newZoom !== zoom) {
        // Calculate zoom center point to zoom towards mouse position
        const zoomPointX = (mouseX - panX) / zoom;
        const zoomPointY = (mouseY - panY) / zoom;

        const newPanX = mouseX - zoomPointX * newZoom;
        const newPanY = mouseY - zoomPointY * newZoom;

        onZoomChange(newZoom);
        if (onPanChange) {
          onPanChange(newPanX, newPanY);
        }
      }
    },
    [zoom, panX, panY, onZoomChange, onPanChange]
  );

  // Draw the grid on canvas
  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save the context state
    ctx.save();

    // Apply zoom and pan transforms
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Draw cells
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cell = cells[row][col];
        const x = col * cellSize;
        const y = row * cellSize;

        // Set fill color based on cell stage
        ctx.fillStyle = getCellBackgroundColor(
          cell.stage,
          numCellStages,
          colorScheme
        );
        ctx.fillRect(x, y, cellSize, cellSize);

        // Draw cell border (adjust line width for zoom)
        ctx.strokeStyle = "#ddd";
        ctx.lineWidth = 1 / zoom; // Keep border thickness consistent
        ctx.strokeRect(x, y, cellSize, cellSize);
      }
    }

    // Restore the context state
    ctx.restore();
  }, [
    cells,
    rows,
    cols,
    cellSize,
    zoom,
    panX,
    panY,
    numCellStages,
    colorScheme,
  ]);

  // Redraw when cells or props change
  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  // Set canvas size to fill container
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Update canvas size based on container
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        const container = canvasRef.current.parentElement;
        const rect = container.getBoundingClientRect();
        setCanvasSize({
          width: rect.width || 800,
          height: rect.height || 600,
        });
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  // Set canvas dimensions
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = canvasSize.width;
      canvasRef.current.height = canvasSize.height;
      drawGrid();
    }
  }, [canvasSize, drawGrid]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className="game-grid"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()} // Disable right-click context menu
      style={{
        border: "2px solid #333",
        cursor: isPanning ? "grab" : isDragging ? "crosshair" : "pointer",
        touchAction: "none", // Prevent default touch behaviors like scrolling/zooming
      }}
    />
  );
};

// Header component
const Header = ({ onToggleSidebar, isSidebarOpen }) => (
  <header className="app-header">
    <h1 className="app-title">Game of Life: Evolved</h1>
    <Button
      onClick={onToggleSidebar}
      className="sidebar-toggle customize-button"
      variant="primary"
      title={
        isSidebarOpen
          ? "Close customization panel"
          : "Open customization panel - change colors, rules, speed, and more!"
      }
    >
      <FontAwesomeIcon icon={isSidebarOpen ? faTimes : faBars} />
      <span className="customize-text">
        {isSidebarOpen ? "Close" : "Customize"}
      </span>
    </Button>
  </header>
);

// Evolve sidebar component
const EvolveSidebar = ({
  isOpen,
  onClose,
  onRandomEverything,
  numCellStages,
  onStagesChange,
  rules,
  onRuleChange,
  onReset,
}) => (
  <div className={`sidebar evolve-sidebar ${isOpen ? "sidebar-open" : ""}`}>
    <div className="sidebar-content">
      <div className="sidebar-header">
        <h3>
          <FontAwesomeIcon
            icon={faCog}
            style={{ marginRight: "0.5rem", color: "#007bff" }}
          />
          Evolution Controls
        </h3>
        <Button onClick={onClose} className="sidebar-close">
          <FontAwesomeIcon icon={faTimes} />
        </Button>
      </div>

      <div className="sidebar-section">
        <Button
          onClick={onRandomEverything}
          variant="success"
          className="sidebar-button full-width"
          style={{ width: "100%", marginBottom: "1rem" }}
        >
          Randomize
        </Button>
      </div>

      <div className="sidebar-section">
        <h4 className="sidebar-section-title">Stages</h4>
        <label className="sidebar-label">{numCellStages}</label>
        <input
          className="sidebar-slider"
          type="range"
          min="2"
          max="8"
          value={numCellStages}
          onChange={onStagesChange}
        />
      </div>

      <RulesControl
        rules={rules}
        onRuleChange={onRuleChange}
        numCellStages={numCellStages}
      />

      <div className="sidebar-footer">
        <Button onClick={onReset} variant="default" className="sidebar-reset">
          Reset
        </Button>
      </div>
    </div>
  </div>
);

// Footer component with main control buttons
const Footer = ({
  onStep,
  onToggleAuto,
  isAutoStepping,
  onClear,
  onToggleEvolveSidebar,
}) => (
  <footer className="app-footer">
    <Button
      onClick={onToggleEvolveSidebar}
      variant="success"
      className="footer-button"
    >
      Evolve
    </Button>

    <div className="footer-center">
      <Button onClick={onStep} variant="primary" className="footer-button">
        Step
      </Button>
      <Button
        onClick={onToggleAuto}
        variant={isAutoStepping ? "default" : "success"}
        className="footer-button"
      >
        {isAutoStepping ? "Stop" : "Start"}
      </Button>
    </div>

    <Button onClick={onClear} variant="default" className="footer-button">
      Clear
    </Button>
  </footer>
);

// Component for rendering the rules UI (compact for sidebar)
const RulesControl = ({ rules, onRuleChange, numCellStages }) => {
  const getButtonStyle = (value) => ({
    backgroundColor:
      value === "survive"
        ? "#90EE90"
        : value === "evolve"
        ? "#FFF500"
        : "#FFB6C1",
  });

  const getDisplayIcon = (rule, stage) => {
    if (stage === 0) {
      // Stage 0 (dead cells): only die (remain dead) or evolve (birth)
      if (rule === "evolve") {
        return <FontAwesomeIcon icon={faArrowUp} title="birth" />;
      } else if (rule === "die") {
        return <FontAwesomeIcon icon={faSkull} title="remain dead" />;
      }
    } else if (stage === numCellStages - 1) {
      // Final stage: only survive or die
      if (rule === "survive" || rule === "evolve") {
        return <FontAwesomeIcon icon={faHeart} title="survive" />;
      } else if (rule === "die") {
        return <FontAwesomeIcon icon={faSkull} title="die" />;
      }
    } else {
      // Middle stages: all three options
      if (rule === "survive") {
        return <FontAwesomeIcon icon={faHeart} title="survive" />;
      } else if (rule === "evolve") {
        return <FontAwesomeIcon icon={faArrowUp} title="evolve" />;
      } else if (rule === "die") {
        return <FontAwesomeIcon icon={faSkull} title="die" />;
      }
    }
  };

  const getTooltipText = (rule, stage, neighbors) => {
    let actionText = rule;
    if (stage === 0) {
      actionText = rule === "evolve" ? "birth" : "remain dead";
    }
    return `${neighbors} neighbors: ${actionText}`;
  };

  return (
    <div className="rules-control">
      <h4 className="sidebar-section-title">Rules</h4>
      {rules.slice(0, numCellStages).map((stageRules, stage) => (
        <div key={stage} className="rules-stage-compact">
          <div className="stage-header-compact">Stage {stage}</div>
          <div className="rules-buttons-compact">
            {stageRules.map((rule, neighbors) => (
              <button
                key={neighbors}
                className="rule-button-compact"
                style={getButtonStyle(rule)}
                onClick={() => onRuleChange(stage, neighbors)}
                title={getTooltipText(rule, stage, neighbors)}
              >
                <span className="neighbor-count-compact">{neighbors}</span>
                <span className="rule-icon-compact">
                  {getDisplayIcon(rule, stage)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Sidebar component
const Sidebar = ({
  isOpen,
  onClose,
  zoom,
  onZoomChange,
  speed,
  onSpeedChange,
  onReset,
  colorScheme,
  onColorSchemeChange,
  rows,
  cols,
}) => (
  <div className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
    <div className="sidebar-content">
      <div className="sidebar-header">
        <h3>
          <FontAwesomeIcon
            icon={faCog}
            style={{ marginRight: "0.5rem", color: "#007bff" }}
          />
          Customize Game
        </h3>
        <Button onClick={onClose} className="sidebar-close">
          <FontAwesomeIcon icon={faTimes} />
        </Button>
      </div>

      <div className="sidebar-section">
        <h4 className="sidebar-section-title">Zoom</h4>
        <label className="sidebar-label">
          {(zoom * 100).toFixed(0)}% (Grid: {rows} × {cols})
        </label>
        <input
          className="sidebar-slider"
          type="range"
          min="1.0"
          max="8.0"
          step="0.1"
          value={zoom}
          onChange={onZoomChange}
        />
      </div>

      <div className="sidebar-section">
        <h4 className="sidebar-section-title">Speed</h4>
        <label className="sidebar-label">Speed: {speed}</label>
        <input
          className="sidebar-slider"
          type="range"
          min="1"
          max="10"
          value={speed}
          onChange={onSpeedChange}
        />
      </div>

      <div className="sidebar-section">
        <h4 className="sidebar-section-title">Color Scheme</h4>
        <select
          className="sidebar-select"
          value={colorScheme}
          onChange={(e) => onColorSchemeChange(e.target.value)}
        >
          <option value="greyscale">Greyscale</option>
          <option value="blue-purple">Blue → Purple</option>
          <option value="green-blue">Green → Blue</option>
          <option value="orange-red">Orange → Red</option>
          <option value="purple-pink">Purple → Pink</option>
          <option value="teal-navy">Teal → Navy</option>
        </select>
      </div>

      <div className="sidebar-footer">
        <Button onClick={onReset} variant="default" className="sidebar-reset">
          Reset
        </Button>
      </div>
    </div>
  </div>
);

class App extends Component {
  constructor(props) {
    super(props);

    // Fixed logical grid size - no longer dependent on screen size
    const GRID_ROWS = 100;
    const GRID_COLS = 100;

    this.state = {
      numCellStages: 2,
      rules: createRules(),
      isAutoStepping: false,
      speed: 5, // Speed scale from 1 (slowest) to 10 (fastest), default medium-fast
      colorScheme: "greyscale", // Default to greyscale
      isSidebarOpen: false, // Start with sidebar closed but make customization obvious through other UX improvements
      isEvolveSidebarOpen: false, // New state for evolve sidebar
      // Fixed grid size with zoom/pan
      rows: GRID_ROWS,
      cols: GRID_COLS,
      cells: createCells(GRID_ROWS, GRID_COLS),
      cellSize: 8, // Base cell size for rendering
      zoom: 1.5, // Zoom level (1.0 = base size)
      panX: 0, // Pan offset X
      panY: 0, // Pan offset Y
      showInstructions: true, // New state for instructions overlay
    };
    this.autoStepInterval = null;
    this.gridContainerRef = React.createRef();
  }

  componentDidMount() {
    document.addEventListener("click", this.handleClickOutside);
  }

  componentWillUnmount() {
    this.stopAutoStepping();
    document.removeEventListener("click", this.handleClickOutside);
  }

  // Handler for clicking outside the sidebars
  handleClickOutside = (event) => {
    // Close evolve sidebar if clicking outside
    if (
      this.state.isEvolveSidebarOpen &&
      !event.target.closest(".evolve-sidebar") &&
      !event.target.closest(".footer-button")
    ) {
      this.setState({ isEvolveSidebarOpen: false });
    }
  };

  // Increment the cell's stage, wrapping around
  incrementCellStage = (cell) => {
    cell.stage = (cell.stage + 1) % this.state.numCellStages;
    return cell;
  };

  // Get the number of neighbours of a cell
  getNumNeighbours = (cell, cells) => {
    const neighbourIndices = [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
      [1, 0],
      [1, -1],
      [0, -1],
    ];

    return neighbourIndices.reduce((numNeighbours, neighbour) => {
      // Get the row and column of the neighbour
      const neighbourRow = cell.row + neighbour[0];
      const neighbourCol = cell.col + neighbour[1];

      // Check if the neighbour is on the board
      const isNeighbourOnBoard =
        neighbourRow >= 0 &&
        neighbourRow < this.state.rows &&
        neighbourCol >= 0 &&
        neighbourCol < this.state.cols;

      // Check if the neighbour is alive
      const isNeighbourAlive =
        isNeighbourOnBoard && cells[neighbourRow][neighbourCol].stage > 0;

      // Return the previous number of neighbours, plus 1 if the neighbour is alive
      return numNeighbours + isNeighbourAlive;
    }, 0);
  };

  // Handler function for clicking on a cell
  handleCellClick = (cell) => {
    const updateCells = (prevState) => {
      // Make a deep copy of the cells
      const newCells = JSON.parse(JSON.stringify(prevState.cells));

      // Increment the cell's stage
      newCells[cell.row][cell.col] = this.incrementCellStage(cell);
      return newCells;
    };

    // Update the state with the new cells
    this.setState((prevState) => ({
      cells: updateCells(prevState),
    }));
  };

  // Handler function for changing the number of cell stages
  handleStagesChange = (event) => {
    const newNumCellStages = parseInt(event.target.value);
    this.setState({
      numCellStages: newNumCellStages,
    });
  };

  // Handler function for changing zoom level
  handleZoomChange = (event) => {
    const newZoom = parseFloat(event.target.value);
    this.setState({
      zoom: newZoom,
    });
  };

  // Handler for zoom changes from Grid component (wheel zoom)
  handleZoomChangeFromGrid = (newZoom) => {
    this.setState({
      zoom: newZoom,
    });
  };

  // Handler for pan changes from Grid component
  handlePanChange = (newPanX, newPanY) => {
    this.setState({
      panX: newPanX,
      panY: newPanY,
    });
  };

  // Convert speed (1-10) to interval in milliseconds
  getIntervalFromSpeed = (speed) => {
    // Speed 1 = 230ms (slowest), Speed 10 = 50ms (fastest)
    return 250 - speed * 20;
  };

  // Start auto-stepping
  startAutoStepping = () => {
    this.autoStepInterval = setInterval(() => {
      this.handleStepForward();
    }, this.getIntervalFromSpeed(this.state.speed));
  };

  // Stop auto-stepping
  stopAutoStepping = () => {
    if (this.autoStepInterval) {
      clearInterval(this.autoStepInterval);
      this.autoStepInterval = null;
    }
  };

  // Handler function for changing step interval
  handleSpeedChange = (event) => {
    const newSpeed = parseInt(event.target.value);
    const wasAutoStepping = this.state.isAutoStepping;

    // If currently auto-stepping, restart with new interval
    if (wasAutoStepping) {
      this.stopAutoStepping();
    }

    this.setState({ speed: newSpeed }, () => {
      if (wasAutoStepping) {
        this.startAutoStepping();
      }
    });
  };

  // Handler function for toggling auto-step mode
  handleAutoStepToggle = () => {
    if (this.state.isAutoStepping) {
      this.stopAutoStepping();
      this.setState({ isAutoStepping: false });
    } else {
      this.startAutoStepping();
      this.setState({ isAutoStepping: true });
    }
  };

  // Handler function for random fill
  handleRandomFill = () => {
    // Generate random fill percentage between 40-60%
    const fillPercentage = 0.4 + Math.random() * 0.2; // 40% to 60%

    this.setState((prevState) => {
      // Make a deep copy of the cells
      const newCells = JSON.parse(JSON.stringify(prevState.cells));

      // Fill cells randomly
      for (let r = 0; r < prevState.rows; r++) {
        for (let c = 0; c < prevState.cols; c++) {
          if (Math.random() < fillPercentage) {
            // Set to random stage from 1 to numCellStages-1 (not 0)
            const randomStage =
              1 + Math.floor(Math.random() * (prevState.numCellStages - 1));
            newCells[r][c].stage = randomStage;
          } else {
            // Set to dead (stage 0)
            newCells[r][c].stage = 0;
          }
        }
      }

      return { cells: newCells };
    });
  };

  // Handler function for random evolution rules
  handleRandomEvolution = () => {
    this.setState((prevState) => {
      const newRules = [];
      const MAX_STAGES = 8;

      for (let stage = 0; stage < MAX_STAGES; stage++) {
        newRules[stage] = [];

        // Get available rules for this stage
        let availableRules;
        if (stage === 0) {
          // Stage 0: only "die" (remain dead) or "evolve" (birth)
          availableRules = ["die", "evolve"];
        } else if (stage === MAX_STAGES - 1) {
          // Final stage (stage 7): only "survive" or "die"
          availableRules = ["survive", "die"];
        } else {
          // Middle stages (1-6): all three options
          availableRules = ["survive", "evolve", "die"];
        }

        // Set random rule for each neighbor count (0-8)
        for (let neighbors = 0; neighbors <= 8; neighbors++) {
          const randomIndex = Math.floor(Math.random() * availableRules.length);
          newRules[stage][neighbors] = availableRules[randomIndex];
        }
      }

      return { rules: newRules };
    });
  };

  // Handler function for randomize (combines random fill, random evolution, and auto-start)
  handleRandomize = () => {
    // First do random fill
    this.handleRandomFill();

    // Then do random evolution
    this.handleRandomEvolution();

    // Finally start auto-stepping
    if (!this.state.isAutoStepping) {
      this.startAutoStepping();
      this.setState({ isAutoStepping: true });
    }
  };

  // Handler function for changing rule values
  handleRuleChange = (stage, neighbors) => {
    const getAvailableRules = (stage) => {
      if (stage === 0) {
        // Stage 0: only "die" (remain dead) or "evolve" (birth)
        return ["die", "evolve"];
      } else if (stage === this.state.numCellStages - 1) {
        // Final stage: only "survive" or "die"
        return ["survive", "die"];
      } else {
        // Middle stages: all three options
        return ["survive", "evolve", "die"];
      }
    };

    this.setState((prevState) => {
      const newRules = JSON.parse(JSON.stringify(prevState.rules));
      const availableRules = getAvailableRules(stage);
      const currentIndex = availableRules.indexOf(newRules[stage][neighbors]);
      const nextIndex = (currentIndex + 1) % availableRules.length;
      newRules[stage][neighbors] = availableRules[nextIndex];
      return { rules: newRules };
    });
  };

  // Handler function for changing color scheme
  handleColorSchemeChange = (colorScheme) => {
    this.setState({
      colorScheme: colorScheme,
    });
  };

  handleStepForward = () => {
    const updateAllCells = (prevState) => {
      // Make a deep copy of the cells
      const newCells = JSON.parse(JSON.stringify(prevState.cells));

      // Go through each cell and update its stage based on the Game of Life rules
      for (let r = 0; r < prevState.rows; r++) {
        for (let c = 0; c < prevState.cols; c++) {
          const currentCell = newCells[r][c];

          // If cell stage is beyond the current numCellStages, it dies
          if (currentCell.stage >= prevState.numCellStages) {
            currentCell.stage = 0;
            continue;
          }

          // Get the number of neighbours of that cell from the previous state
          const numNeighbours = this.getNumNeighbours(
            prevState.cells[r][c],
            prevState.cells
          );

          // Get the rule for this stage and neighbor count
          let rule = prevState.rules[currentCell.stage][numNeighbours];

          // If we're at the max stage and the rule is "evolve", treat as "survive"
          if (
            currentCell.stage === prevState.numCellStages - 1 &&
            rule === "evolve"
          ) {
            rule = "survive";
          }

          // Apply the rule
          if (rule === "die") {
            currentCell.stage = 0;
          } else if (rule === "evolve") {
            newCells[r][c] = this.incrementCellStage(currentCell);
          }
          // "survive" means do nothing - keep current stage
        }
      }

      return newCells;
    };

    this.setState((prevState) => ({
      cells: updateAllCells(prevState),
    }));
  };

  // Handler function for moving the entire board forward one step
  handleStepClick = () => {
    this.handleStepForward();
    if (this.state.isAutoStepping) {
      this.stopAutoStepping();
      this.setState(() => ({
        isAutoStepping: false,
      }));
    }
  };

  handleClear = () => {
    this.stopAutoStepping();
    this.setState(() => ({
      cells: createCells(this.state.rows, this.state.cols),
      isAutoStepping: false,
    }));
  };

  handleReset = () => {
    if (this.state.isAutoStepping) {
      this.stopAutoStepping();
    }

    // Reset all settings to defaults
    this.setState({
      numCellStages: 2,
      rules: createRules(),
      isAutoStepping: false,
      speed: 5,
      colorScheme: "greyscale",
      isSidebarOpen: true,
      isEvolveSidebarOpen: false,
      cells: createCells(this.state.rows, this.state.cols),
      zoom: 1.5,
      panX: 0,
      panY: 0,
    });
  };

  // Handler for resetting only customization settings (zoom, speed, color, pan)
  handleCustomizeReset = () => {
    this.setState({
      speed: 5,
      colorScheme: "greyscale",
      zoom: 1.5,
      panX: 0,
      panY: 0,
    });
  };

  // Handler for resetting only evolution settings (stages, rules)
  handleEvolveReset = () => {
    this.setState({
      numCellStages: 2,
      rules: createRules(),
    });
  };

  handleToggleSidebar = () => {
    this.setState((prevState) => ({
      isSidebarOpen: !prevState.isSidebarOpen,
    }));
  };

  handleCloseSidebar = () => {
    this.setState({ isSidebarOpen: false });
  };

  // Handler for toggling the evolve sidebar
  handleToggleEvolveSidebar = () => {
    this.setState((prevState) => ({
      isEvolveSidebarOpen: !prevState.isEvolveSidebarOpen,
    }));
  };

  // Handler for closing the evolve sidebar
  handleCloseEvolveSidebar = () => {
    this.setState({ isEvolveSidebarOpen: false });
  };

  // Handler for random everything from evolve sidebar
  handleRandomEverythingFromEvolve = () => {
    this.handleRandomStages(() => {
      this.handleRandomEvolution();
    });
  };

  handleRandomStages = (callback) => {
    const newNumCellStages = 2 + Math.floor(Math.random() * 7);
    this.setState(
      {
        numCellStages: newNumCellStages,
        // Don't recreate rules - preserve existing rules
      },
      callback
    );
  };

  // Handler to hide instructions on first interaction
  handleFirstInteraction = () => {
    if (this.state.showInstructions) {
      this.setState({ showInstructions: false });
    }
  };

  render() {
    return (
      <div className="app-container">
        <Header
          onToggleSidebar={this.handleToggleSidebar}
          isSidebarOpen={this.state.isSidebarOpen}
        />

        <main className="app-main" ref={this.gridContainerRef}>
          <div className="grid-container">
            <Grid
              cells={this.state.cells}
              onCellClick={this.handleCellClick}
              numCellStages={this.state.numCellStages}
              rows={this.state.rows}
              cols={this.state.cols}
              cellSize={this.state.cellSize}
              zoom={this.state.zoom}
              panX={this.state.panX}
              panY={this.state.panY}
              onZoomChange={this.handleZoomChangeFromGrid}
              onPanChange={this.handlePanChange}
              colorScheme={this.state.colorScheme}
              onFirstInteraction={this.handleFirstInteraction}
            />
          </div>
        </main>

        <Footer
          onStep={this.handleStepClick}
          onToggleAuto={this.handleAutoStepToggle}
          isAutoStepping={this.state.isAutoStepping}
          onClear={this.handleClear}
          onToggleEvolveSidebar={this.handleToggleEvolveSidebar}
        />

        <Sidebar
          isOpen={this.state.isSidebarOpen}
          onClose={this.handleCloseSidebar}
          zoom={this.state.zoom}
          onZoomChange={this.handleZoomChange}
          speed={this.state.speed}
          onSpeedChange={this.handleSpeedChange}
          onReset={this.handleCustomizeReset}
          colorScheme={this.state.colorScheme}
          onColorSchemeChange={this.handleColorSchemeChange}
          rows={this.state.rows}
          cols={this.state.cols}
        />

        <EvolveSidebar
          isOpen={this.state.isEvolveSidebarOpen}
          onClose={this.handleCloseEvolveSidebar}
          onRandomEverything={this.handleRandomEverythingFromEvolve}
          numCellStages={this.state.numCellStages}
          onStagesChange={this.handleStagesChange}
          rules={this.state.rules}
          onRuleChange={this.handleRuleChange}
          onReset={this.handleEvolveReset}
        />

        {this.state.isSidebarOpen && (
          <div className="sidebar-backdrop" onClick={this.handleCloseSidebar} />
        )}

        {this.state.isEvolveSidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={this.handleCloseEvolveSidebar}
          />
        )}

        {this.state.showInstructions && (
          <InstructionsOverlay onHide={this.handleFirstInteraction} />
        )}
      </div>
    );
  }
}

export default App;
