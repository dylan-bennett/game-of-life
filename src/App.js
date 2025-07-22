import React, { Component } from "react";

const width = 400;
const height = 300;
const rows = 4;
const cols = 5;
const numCellStages = 2;

// Initialize our 2D array of cells
const createCells = () => {
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

// Render the grid of cells as an HTML table
const Grid = ({ cells, onCellClick }) => {
  const handleCellClick = (cell) => onCellClick(cell);

  // Create the HTML table of cells
  const tableRows = [];
  for (let r = 0; r < rows; r++) {
    const rowCells = [];
    for (let c = 0; c < cols; c++) {
      rowCells.push(
        <td
          key={`${r},${c}`}
          width={width / cols}
          height={height / rows}
          onClick={() => handleCellClick(cells[r][c])}
        >
          {cells[r][c].stage}
        </td>
      );
    }
    tableRows.push(<tr key={r}>{rowCells}</tr>);
  }

  return (
    <table>
      <tbody>{tableRows}</tbody>
    </table>
  );
};

class App extends Component {
  state = {
    cells: createCells(),
  };

  // Increment the cell's stage, wrapping around
  incrementCellStage = (cell) => {
    cell.stage = (cell.stage + 1) % numCellStages;
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
        neighbourRow < rows &&
        neighbourCol >= 0 &&
        neighbourCol < cols;

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

  // Handler function for moving the entire board forward one step
  handleStepClick = () => {
    const updateAllCells = (prevState) => {
      // Make a deep copy of the cells
      const newCells = JSON.parse(JSON.stringify(prevState.cells));

      // Go through each cell and update its stage based on the Game of Life rules
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Get the number of neighbours of that cell from the previous state
          const numNeighbours = this.getNumNeighbours(
            prevState.cells[r][c],
            prevState.cells
          );

          // Update the cell's stage based on the rules, using the number of neighbours
          // NOTE: going to start with the basic rules, then add more complexity later
          if (prevState.cells[r][c].stage === 0) {
            if ([3].includes(numNeighbours)) {
              newCells[r][c] = this.incrementCellStage(newCells[r][c]);
            }
          } else if (prevState.cells[r][c].stage === 1) {
            if ([0, 1, 4, 5, 6, 7, 8].includes(numNeighbours)) {
              newCells[r][c] = this.incrementCellStage(newCells[r][c]);
            }
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

  render() {
    return (
      <>
        <Grid cells={this.state.cells} onCellClick={this.handleCellClick} />
        <div>
          <button type="button" onClick={this.handleStepClick}>
            Step
          </button>
        </div>
      </>
    );
  }
}

export default App;
