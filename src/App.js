import React, {
  Component,
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSkull, faHeart, faDna } from "@fortawesome/free-solid-svg-icons";

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

  if (colorScheme === "rainbow") {
    // For rainbow mode, use HSL with softer, more pleasant colors
    const hue = Math.round((stage / (numCellStages - 1)) * 280); // Use 280° instead of 360° to avoid harsh reds/magentas
    const saturation = 65; // Reduced saturation for softer colors
    const lightness = 70; // Higher lightness for pastel-like appearance
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  } else {
    // Original greyscale mode
    // Calculate color value (0-255) interpolating from white (255) to black (0)
    const colorValue = Math.round(255 * (1 - stage / (numCellStages - 1)));

    // Convert to hex color
    const hexValue = colorValue.toString(16).padStart(2, "0");
    return `#${hexValue}${hexValue}${hexValue}`;
  }
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
      // For stage 0 (dead cells), default to "die" (remain dead)
      // For other stages, default to "survive"
      rules[stage][neighbors] = stage === 0 ? "die" : "survive";
    }
  }
  return rules;
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
        }
      }
    },
    [getCellFromMousePos, isDragging, lastDraggedCell, onCellClick, cells]
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
    <div className="grid-container">
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
    </div>
  );
};

// Component for game control buttons (simulation flow)
const GameControls = ({ onStep, onToggleAuto, isAutoStepping }) => (
  <div className="control-section">
    <h4 className="section-title">Simulation Controls</h4>
    <div className="button-group">
      <Button onClick={onStep} variant="primary">
        Step
      </Button>
      <Button
        onClick={onToggleAuto}
        variant={isAutoStepping ? "default" : "success"}
      >
        {isAutoStepping ? "Stop" : "Start"}
      </Button>
    </div>
  </div>
);

// Component for board action buttons (modify board state)
const BoardActions = ({ onRandomize, onClear, onReset }) => (
  <div className="control-section">
    <h4 className="section-title">Board Actions</h4>
    <div className="button-group">
      <Button onClick={onRandomize} variant="success">
        Randomize
      </Button>
      <Button onClick={onClear}>Clear</Button>
      <Button onClick={onReset}>Reset</Button>
    </div>
  </div>
);

// Component for rendering the rules UI
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
        return <FontAwesomeIcon icon={faDna} title="birth" />;
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
        return <FontAwesomeIcon icon={faDna} title="evolve" />;
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
    <div>
      <h3 className="section-title">Cell Evolution Rules</h3>
      {rules.map((stageRules, stage) => (
        <div key={stage} className="rules-stage">
          <div className="stage-header">Stage {stage} → (neighbors: 0-8)</div>
          <div className="rules-buttons">
            {stageRules.map((rule, neighbors) => (
              <button
                key={neighbors}
                className="rule-button rule-button-icon"
                style={getButtonStyle(rule)}
                onClick={() => onRuleChange(stage, neighbors)}
                title={getTooltipText(rule, stage, neighbors)}
              >
                <span className="neighbor-count">{neighbors}</span>
                {getDisplayIcon(rule, stage)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

class App extends Component {
  constructor(props) {
    super(props);

    // Fixed grid dimensions
    const gridWidth = 600;
    const gridHeight = 400;
    const cellSize = 20;
    const numCellStages = 2;

    // Calculate rows and cols based on grid size and cell size
    const rows = Math.floor(gridHeight / cellSize);
    const cols = Math.floor(gridWidth / cellSize);

    this.state = {
      gridWidth: gridWidth,
      gridHeight: gridHeight,
      cellSize: cellSize,
      rows: rows,
      cols: cols,
      cells: createCells(rows, cols),
      numCellStages: numCellStages,
      rules: createRules(numCellStages),
      isAutoStepping: false,
      stepInterval: 100, // milliseconds between auto-steps
      colorScheme: "greyscale", // Default to greyscale
    };
    this.autoStepInterval = null;
  }

  // Calculate rows and cols based on grid size and cell size
  calculateGridDimensions = (cellSize) => {
    const rows = Math.floor(this.state.gridHeight / cellSize);
    const cols = Math.floor(this.state.gridWidth / cellSize);
    return { rows, cols };
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
    const { rows, cols } = this.calculateGridDimensions(this.state.cellSize);
    this.setState({
      numCellStages: newNumCellStages,
      rows: rows,
      cols: cols,
      cells: createCells(rows, cols), // Reset the board when changing stages
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
    const { rows, cols } = this.calculateGridDimensions(newCellSize);
    this.setState({
      cellSize: newCellSize,
      rows: rows,
      cols: cols,
      cells: createCells(rows, cols),
      isAutoStepping: false,
    });
  };

  // Start auto-stepping
  startAutoStepping = () => {
    this.autoStepInterval = setInterval(() => {
      this.handleStepForward();
    }, this.state.stepInterval);
  };

  // Stop auto-stepping
  stopAutoStepping = () => {
    if (this.autoStepInterval) {
      clearInterval(this.autoStepInterval);
      this.autoStepInterval = null;
    }
  };

  // Handler function for changing step interval
  handleIntervalChange = (event) => {
    const newInterval = parseInt(event.target.value);
    const wasAutoStepping = this.state.isAutoStepping;

    // If currently auto-stepping, restart with new interval
    if (wasAutoStepping) {
      this.stopAutoStepping();
    }

    this.setState({ stepInterval: newInterval }, () => {
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

  // Cleanup when component unmounts
  componentWillUnmount() {
    this.stopAutoStepping();
  }

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

          // Update the cell's neighbours on the new state
          // TODO: My plan is to use this to track the number of neighbours of each cell,
          // so that I can use it to calculate the next stage of the cell.
          // newCells[r][c].neighbours = numNeighbours;
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
    const { rows, cols } = this.calculateGridDimensions(this.state.cellSize);
    this.setState(() => ({
      cells: createCells(rows, cols),
    }));
  };

  handleReset = () => {
    if (this.state.isAutoStepping) {
      this.stopAutoStepping();
      this.setState(() => ({
        isAutoStepping: false,
      }));
    }
    const { rows, cols } = this.calculateGridDimensions(this.state.cellSize);
    this.setState(() => ({
      cells: createCells(rows, cols),
      rules: createRules(this.state.numCellStages),
    }));
  };

  render() {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1 className="app-title">Game of Life</h1>
        </header>

        <div className="grid-controls">
          <div className="control-group">
            <label htmlFor="cell-size-slider" className="control-label">
              Cell Size: {this.state.cellSize}px (Grid: {this.state.rows} ×{" "}
              {this.state.cols})
            </label>
            <input
              id="cell-size-slider"
              className="control-slider"
              type="range"
              min="10"
              max="50"
              value={this.state.cellSize}
              onChange={this.handleCellSizeChange}
            />
          </div>

          <div className="control-group">
            <label htmlFor="stages-slider" className="control-label">
              Cell Stages: {this.state.numCellStages}
            </label>
            <input
              id="stages-slider"
              className="control-slider"
              type="range"
              min="2"
              max="8"
              value={this.state.numCellStages}
              onChange={this.handleStagesChange}
            />
          </div>

          <div className="control-group">
            <label className="control-label">Color Scheme</label>
            <div className="button-group">
              <Button
                onClick={() => this.handleColorSchemeChange("greyscale")}
                variant={
                  this.state.colorScheme === "greyscale" ? "primary" : "default"
                }
                className="color-scheme-option"
              >
                🔲 Greyscale
              </Button>
              <Button
                onClick={() => this.handleColorSchemeChange("rainbow")}
                variant={
                  this.state.colorScheme === "rainbow" ? "primary" : "default"
                }
                className="color-scheme-option"
              >
                🌈 Rainbow
              </Button>
            </div>
          </div>
        </div>

        <Grid
          cells={this.state.cells}
          onCellClick={this.handleCellClick}
          numCellStages={this.state.numCellStages}
          rows={this.state.rows}
          cols={this.state.cols}
          cellSize={this.state.cellSize}
          colorScheme={this.state.colorScheme}
        />

        <div className="controls-layout">
          <GameControls
            onStep={this.handleStepClick}
            onToggleAuto={this.handleAutoStepToggle}
            isAutoStepping={this.state.isAutoStepping}
          />

          <BoardActions
            onRandomize={this.handleRandomize}
            onClear={this.handleClear}
            onReset={this.handleReset}
          />

          <div className="control-section">
            <h4 className="section-title">Auto-step Speed</h4>
            <div className="speed-control">
              <label htmlFor="interval-slider" className="control-label">
                {this.state.stepInterval}ms between steps
              </label>
              <input
                id="interval-slider"
                className="speed-slider"
                type="range"
                min="50"
                max="1000"
                value={this.state.stepInterval}
                onChange={this.handleIntervalChange}
              />
              <p className="speed-info">50ms = fastest • 1000ms = slowest</p>
            </div>
          </div>
        </div>

        <div className="control-section rules-section">
          <RulesControl
            rules={this.state.rules}
            onRuleChange={this.handleRuleChange}
          />
        </div>
      </div>
    );
  }
}

export default App;
