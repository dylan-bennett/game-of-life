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
const createRules = (numCellStages) => {
  const rules = [];
  for (let stage = 0; stage < numCellStages; stage++) {
    rules[stage] = [];
    for (let neighbors = 0; neighbors <= 8; neighbors++) {
      if (stage === 0) {
        // Stage 0 (dead cells): Classic GoL birth rule - exactly 3 neighbors
        rules[stage][neighbors] = neighbors === 3 ? "evolve" : "die";
      } else if (stage === numCellStages - 1) {
        // Final stage: Classic GoL survival rule - 2 or 3 neighbors
        rules[stage][neighbors] =
          neighbors === 2 || neighbors === 3 ? "survive" : "die";
      } else {
        // Middle stages: default to survive for 2-3 neighbors, evolve for others
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
    ? "Drag your finger over the grid, then press Start"
    : "Click and drag over the grid, then click Start";

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
          maxWidth: "350px",
          margin: "1rem",
          border: "2px solid #333",
        }}
      >
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
  colorScheme,
  onFirstInteraction, // New prop for hiding instructions
}) => {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastDraggedCell, setLastDraggedCell] = useState(null);

  // Get cell coordinates from mouse position
  const getCellFromMousePos = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const col = Math.floor(x / cellSize);
      const row = Math.floor(y / cellSize);

      if (row >= 0 && row < rows && col >= 0 && col < cols) {
        return { row, col };
      }
      return null;
    },
    [cellSize, rows, cols]
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
      setIsDragging(true);
      setLastDraggedCell(null);
      handleCellInteraction(e);
    },
    [handleCellInteraction]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (isDragging) {
        handleCellInteraction(e);
      }
    },
    [isDragging, handleCellInteraction]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setLastDraggedCell(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setLastDraggedCell(null);
  }, []);

  // Touch event handlers for mobile support
  const handleTouchStart = useCallback(
    (e) => {
      e.preventDefault(); // Prevent scrolling
      const touch = e.touches[0];
      const mouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
      };
      setIsDragging(true);
      setLastDraggedCell(null);
      handleCellInteraction(mouseEvent);
    },
    [handleCellInteraction]
  );

  const handleTouchMove = useCallback(
    (e) => {
      e.preventDefault(); // Prevent scrolling
      if (isDragging && e.touches.length === 1) {
        const touch = e.touches[0];
        const mouseEvent = {
          clientX: touch.clientX,
          clientY: touch.clientY,
        };
        handleCellInteraction(mouseEvent);
      }
    },
    [isDragging, handleCellInteraction]
  );

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    setLastDraggedCell(null);
  }, []);

  // Draw the grid on canvas
  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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

        // Draw cell border
        ctx.strokeStyle = "#ddd";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellSize, cellSize);
      }
    }
  }, [cells, rows, cols, cellSize, numCellStages, colorScheme]);

  // Redraw when cells or props change
  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  // Set canvas size
  const canvasWidth = cols * cellSize;
  const canvasHeight = rows * cellSize;

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="game-grid"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        border: "2px solid #333",
        cursor: isDragging ? "crosshair" : "pointer",
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

// Random dropdown menu component
const RandomDropdown = ({
  isOpen,
  onToggle,
  onRandomFill,
  onRandomRules,
  onRandomEverything,
}) => (
  <div className="random-dropdown">
    <Button
      onClick={onToggle}
      variant="success"
      className="footer-button random-button"
    >
      Random
      <span className={`dropdown-arrow ${isOpen ? "open" : ""}`}>▲</span>
    </Button>
    {isOpen && (
      <div className="dropdown-menu">
        <button className="dropdown-item" onClick={onRandomFill}>
          Random Fill
        </button>
        <button className="dropdown-item" onClick={onRandomRules}>
          Random Rules
        </button>
        <button className="dropdown-item" onClick={onRandomEverything}>
          Random Everything
        </button>
      </div>
    )}
  </div>
);

// Footer component with main control buttons
const Footer = ({
  onStep,
  onToggleAuto,
  isAutoStepping,
  onRandomFill,
  onRandomRules,
  onRandomEverything,
  onClear,
  isRandomDropdownOpen,
  onToggleRandomDropdown,
}) => (
  <footer className="app-footer">
    <Button onClick={onClear} variant="default" className="footer-button">
      Clear
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

    <RandomDropdown
      isOpen={isRandomDropdownOpen}
      onToggle={onToggleRandomDropdown}
      onRandomFill={onRandomFill}
      onRandomRules={onRandomRules}
      onRandomEverything={onRandomEverything}
    />
  </footer>
);

// Component for rendering the rules UI (compact for sidebar)
const RulesControl = ({ rules, onRuleChange }) => {
  const numCellStages = rules.length;

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
      if (rule === "survive") {
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
      {rules.map((stageRules, stage) => (
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
  cellSize,
  onCellSizeChange,
  numCellStages,
  onStagesChange,
  speed,
  onSpeedChange,
  rules,
  onRuleChange,
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
        <h4 className="sidebar-section-title">Cell Size</h4>
        <label className="sidebar-label">
          {cellSize}px (Grid: {rows} × {cols})
        </label>
        <input
          className="sidebar-slider"
          type="range"
          min="15"
          max="50"
          value={cellSize}
          onChange={onCellSizeChange}
        />
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

      <RulesControl rules={rules} onRuleChange={onRuleChange} />

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

    this.state = {
      numCellStages: 2,
      rules: createRules(2),
      isAutoStepping: false,
      speed: 5, // Speed scale from 1 (slowest) to 10 (fastest), default medium-fast
      colorScheme: "greyscale", // Default to greyscale
      isSidebarOpen: false, // Start with sidebar closed but make customization obvious through other UX improvements
      // Grid will be calculated dynamically based on available space
      cellSize: 20,
      cells: [],
      rows: 0,
      cols: 0,
      isRandomDropdownOpen: false, // New state for dropdown
      showInstructions: true, // New state for instructions overlay
    };
    this.autoStepInterval = null;
    this.gridContainerRef = React.createRef();
  }

  componentDidMount() {
    this.calculateGridSize();
    window.addEventListener("resize", this.calculateGridSize);
    document.addEventListener("click", this.handleClickOutside);
  }

  componentWillUnmount() {
    this.stopAutoStepping();
    window.removeEventListener("resize", this.calculateGridSize);
    document.removeEventListener("click", this.handleClickOutside);
  }

  // Handler for clicking outside the dropdown
  handleClickOutside = (event) => {
    if (
      this.state.isRandomDropdownOpen &&
      !event.target.closest(".random-dropdown")
    ) {
      this.setState({ isRandomDropdownOpen: false });
    }
  };

  // Calculate grid dimensions based on available space
  calculateGridSize = () => {
    if (!this.gridContainerRef.current) return;

    const container = this.gridContainerRef.current;
    const rect = container.getBoundingClientRect();

    // Use the full available space - no padding
    const availableWidth = rect.width;
    const availableHeight = rect.height;

    const cols = Math.ceil(availableWidth / this.state.cellSize);
    const rows = Math.ceil(availableHeight / this.state.cellSize);

    // Only update if dimensions have changed
    if (cols !== this.state.cols || rows !== this.state.rows) {
      this.setState({
        cols: Math.max(1, cols),
        rows: Math.max(1, rows),
        cells: createCells(Math.max(1, rows), Math.max(1, cols)),
      });
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
    // Stop auto-stepping if it's running
    if (this.state.isAutoStepping) {
      this.stopAutoStepping();
    }
    this.setState({
      numCellStages: newNumCellStages,
      cells: createCells(this.state.rows, this.state.cols), // Reset the board when changing stages
      rules: createRules(newNumCellStages), // Reset rules for new stage count
      isAutoStepping: false,
    });
  };

  // Handler function for changing cell size
  handleCellSizeChange = (event) => {
    const newCellSize = parseInt(event.target.value);
    // Stop auto-stepping if it's running
    if (this.state.isAutoStepping) {
      this.stopAutoStepping();
    }
    this.setState(
      {
        cellSize: newCellSize,
        isAutoStepping: false,
      },
      () => {
        // Recalculate grid after cellSize changes
        this.calculateGridSize();
      }
    );
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

      for (let stage = 0; stage < prevState.numCellStages; stage++) {
        newRules[stage] = [];

        // Get available rules for this stage
        let availableRules;
        if (stage === 0) {
          // Stage 0: only "die" (remain dead) or "evolve" (birth)
          availableRules = ["die", "evolve"];
        } else if (stage === prevState.numCellStages - 1) {
          // Final stage: only "survive" or "die"
          availableRules = ["survive", "die"];
        } else {
          // Middle stages: all three options
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
          // Get the number of neighbours of that cell from the previous state
          const numNeighbours = this.getNumNeighbours(
            prevState.cells[r][c],
            prevState.cells
          );

          // Update the cell's stage based on the rules, using the number of neighbours
          const rule = prevState.rules[newCells[r][c].stage][numNeighbours];
          if (rule === "die") {
            newCells[r][c].stage = 0;
          } else if (rule === "evolve") {
            newCells[r][c] = this.incrementCellStage(newCells[r][c]);
          }
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
    this.setState(
      {
        numCellStages: 2,
        rules: createRules(2),
        isAutoStepping: false,
        speed: 5,
        colorScheme: "greyscale",
        isSidebarOpen: true,
        cellSize: 20,
        isRandomDropdownOpen: false,
      },
      () => {
        // Recalculate grid with new cell size
        this.calculateGridSize();
      }
    );
  };

  handleToggleSidebar = () => {
    this.setState((prevState) => ({
      isSidebarOpen: !prevState.isSidebarOpen,
    }));
  };

  handleCloseSidebar = () => {
    this.setState({ isSidebarOpen: false });
  };

  // Handler for toggling the random dropdown
  handleToggleRandomDropdown = () => {
    this.setState((prevState) => ({
      isRandomDropdownOpen: !prevState.isRandomDropdownOpen,
    }));
  };

  // Handler for random fill from dropdown
  handleRandomFillFromDropdown = () => {
    this.handleRandomFill();
    this.setState({ isRandomDropdownOpen: false });
  };

  // Handler for random rules from dropdown
  handleRandomRulesFromDropdown = () => {
    this.handleRandomEvolution();
    this.setState({ isRandomDropdownOpen: false });
  };

  // Handler for random everything from dropdown
  handleRandomEverythingFromDropdown = () => {
    this.handleRandomFill();
    this.handleRandomEvolution();
    if (!this.state.isAutoStepping) {
      this.startAutoStepping();
      this.setState({ isAutoStepping: true });
    }
    this.setState({ isRandomDropdownOpen: false });
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
            {this.state.rows > 0 && this.state.cols > 0 && (
              <Grid
                cells={this.state.cells}
                onCellClick={this.handleCellClick}
                numCellStages={this.state.numCellStages}
                rows={this.state.rows}
                cols={this.state.cols}
                cellSize={this.state.cellSize}
                colorScheme={this.state.colorScheme}
                onFirstInteraction={this.handleFirstInteraction}
              />
            )}
          </div>
        </main>

        <Footer
          onStep={this.handleStepClick}
          onToggleAuto={this.handleAutoStepToggle}
          isAutoStepping={this.state.isAutoStepping}
          onRandomFill={this.handleRandomFillFromDropdown}
          onRandomRules={this.handleRandomRulesFromDropdown}
          onRandomEverything={this.handleRandomEverythingFromDropdown}
          onClear={this.handleClear}
          isRandomDropdownOpen={this.state.isRandomDropdownOpen}
          onToggleRandomDropdown={this.handleToggleRandomDropdown}
        />

        <Sidebar
          isOpen={this.state.isSidebarOpen}
          onClose={this.handleCloseSidebar}
          cellSize={this.state.cellSize}
          onCellSizeChange={this.handleCellSizeChange}
          numCellStages={this.state.numCellStages}
          onStagesChange={this.handleStagesChange}
          speed={this.state.speed}
          onSpeedChange={this.handleSpeedChange}
          rules={this.state.rules}
          onRuleChange={this.handleRuleChange}
          onReset={this.handleReset}
          colorScheme={this.state.colorScheme}
          onColorSchemeChange={this.handleColorSchemeChange}
          rows={this.state.rows}
          cols={this.state.cols}
        />

        {this.state.isSidebarOpen && (
          <div className="sidebar-backdrop" onClick={this.handleCloseSidebar} />
        )}

        {this.state.showInstructions && (
          <InstructionsOverlay onHide={this.handleFirstInteraction} />
        )}
      </div>
    );
  }
}

export default App;
