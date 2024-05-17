import React, { Component } from "react";

const totalBoardRows = 6;
const totalBoardCols = 6;
const boardWidth = 400;
const boardHeight = 300;
const numCellStates = 2;
const emptyCell = {
  state: 0,
  content: "X",
  numNeighbours: 0,
};

const getCells = () => {
  /*
  Returns a 2D array of boolean values to represent the cells.
  */
  const grid = [];
  for (let r = 0; r < totalBoardRows; r++) {
    grid[r] = [];
    for (let c = 0; c < totalBoardCols; c++) {
      grid[r][c] = emptyCell;
    }
  }

  return grid;
};

const BoardGrid = ({ cells, onIncrementCellState }) => {
  const handleClick = (r, c, numNeighbours) => onIncrementCellState(r, c, numNeighbours);

  const tr = [];
  for (let r = 0; r < totalBoardRows; r++) {
    const td = [];
    for (let c = 0; c < totalBoardCols; c++) {
      td.push(
        <td
          key={`${r},${c}`}
          className={`cellState${cells[r][c].state}`}
          width={boardWidth/totalBoardCols}
          height={boardHeight/totalBoardRows}
          onClick={() => handleClick(r, c, cells[r][c].numNeighbours)}
        >{cells[r][c].content}</td>
      );
    }
    tr.push(<tr key={r}>{td}</tr>);
  }

  return <table><tbody>{tr}</tbody></table>;
};

const Slider = ({ speed, onSpeedChange }) => {
  const handleChange = e => onSpeedChange(e.target.value);

  return (
    <input
      type="range"
      min="50"
      max="1000"
      step="50"
      value={speed}
      onChange={handleChange}
    />
  );
};

class App extends Component {
  state = {
    cells: getCells(),
    generation: 0,
    isGameRunning: false,
    speed: 850,
  };

  // Start/Stop button
  runStopButton = () => {
    return this.state.isGameRunning ?
      <button type="button" onClick={this.handleStop}>Stop</button> :
      <button type="button" onClick={this.handleRun}>Start</button>;
  }

  // Clear Board button action
  handleClearBoard = () => {
    this.setState({
      cells: getCells(),
      generation: 0,
      isGameRunning: false,
    });
  };

  // New Board button action
  handleNewBoard = () => {
    this.setState({
      cells: getCells(),
      generation: 0,
      isGameRunning: false,
    });
  };

  incrementCellState = (cell, numNeighbours) => {
    cell.state = (cell.state + 1) % numCellStates;
    cell.numNeighbours = numNeighbours;
    return cell;
  };

  // Toggle a cell's status and update the board's status as a result
  handleIncrementCellState = (r, c, numNeighbours) => {
    const updateCells = prevBoard => {
      const clonedCells = JSON.parse(JSON.stringify(prevBoard.cells));
      clonedCells[r][c] = this.incrementCellState(clonedCells[r][c], numNeighbours);
      return clonedCells;
    };

    this.setState(prevBoard => ({
      cells: updateCells(prevBoard)
    }));
  };

  // Return the number of True neighbours of a given cell
  getNumTrueNeighbours = (cells, r, c) => {
    const neighbours = [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1]];
    return neighbours.reduce((numTrueNeighbours, neighbour) => {
      const neighbourRow = r + neighbour[0];
      const neighbourCol = c + neighbour[1];

      const isNeighbourOnBoard = (neighbourRow >= 0 && neighbourRow < totalBoardRows && neighbourCol >= 0 && neighbourCol < totalBoardCols);
      const isNeighbourAlive = isNeighbourOnBoard && cells[neighbourRow][neighbourCol].state > 0;

      return numTrueNeighbours + isNeighbourAlive;

    }, 0);
  };

  // Move the board forward one step by following the rules defined in Conway's Game of Life
  handleStep = () => {
    const nextStep = prevBoard => {
      // current board status
      const cells = prevBoard.cells;

      // updated board status
      const clonedCells = JSON.parse(JSON.stringify(prevBoard.cells));

      // Run through each cell and apply GoL rules for each cell
      for (let r = 0; r < totalBoardRows; r++) {
        for (let c = 0; c < totalBoardCols; c++) {
          const numTrueNeighbours = this.getNumTrueNeighbours(cells, r, c);

          // Conway's Game of Life rule logic
          if (cells[r][c].state === 0) {
            if ([3].includes(numTrueNeighbours)) {
              clonedCells[r][c] = this.incrementCellState(clonedCells[r][c], numTrueNeighbours);
            }
          } else if (cells[r][c].state === 1) {
            if ([0, 1, 4, 5, 6, 7, 8].includes(numTrueNeighbours)) {
              clonedCells[r][c] = this.incrementCellState(clonedCells[r][c], numTrueNeighbours);
            }
          }
        }
      }

      return clonedCells;
    };

    this.setState(prevBoard => ({
      cells: nextStep(prevBoard),
      generation: prevBoard.generation + 1,
    }));
  };

  handleSpeedChange = newSpeed => {
    this.setState({
      speed: newSpeed,
    });
  };

  handleRun = () => {
    this.setState({ isGameRunning: true });
  };

  handleStop = () => {
    this.setState({ isGameRunning: false });
  };

  componentDidUpdate(prevProps, prevBoard) {
    const { isGameRunning, speed } = this.state;
    const speedChanged = prevBoard.speed !== speed;
    const gameStarted = !prevBoard.isGameRunning && isGameRunning;
    const gameStopped = prevBoard.isGameRunning && !isGameRunning;

    // if we changed the speed or stopped the game, clear the timer
    if ((isGameRunning && speedChanged) || gameStopped) {
      clearInterval(this.timerID);
    }

    // if we changed the speed or started the game, set the new timer
    // to go forward a step at the speed's interval
    if ((isGameRunning && speedChanged) || gameStarted) {
      this.timerID = setInterval(() => {
        this.handleStep();
      }, 1050 - speed);
    }
  }

  render() {
    const { cells, isGameRunning, generation, speed } = this.state;

    return (
      <div>
        <h1>Dylan's Game of Life</h1>
        <BoardGrid cells={cells} onIncrementCellState={this.handleIncrementCellState} />
        <div className="flexRow upperControls">
          <span>
            {"- "}
            <Slider speed={speed} onSpeedChange={this.handleSpeedChange} />
            {" +"}
          </span>
          {`Generation: ${generation}`}
        </div>
        <div className="flexRow lowerControls">
          {this.runStopButton()}
          <button type="button" disabled={isGameRunning} onClick={this.handleStep}>Step</button>
          <button type="button" onClick={this.handleClearBoard}>Clear Board</button>
          {/* <button type="button" onClick={this.handleNewBoard}>New Board</button> */}
        </div>
      </div>
    );
  }
}

export default App;