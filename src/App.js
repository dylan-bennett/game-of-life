import React, { Component } from "react";

const width = 400;
const height = 300;
const rows = 4;
const cols = 5;
const numCellStates = 1;

// Initialize our 2D array of cells
const createCells = () => {
    const cells = [];
    for (let r = 0; r < rows; r++) {
        cells[r] = [];
        for (let c = 0; c < cols; c++) {
            cells[r][c] = {
                state: 0,
                neighbours: 0,
            };
        }
    }

    return cells;
};

// Grid of cells, rendered as an HTML table
const Grid = ({ cells }) => {
    const tableRows = [];
    for (let r = 0; r < rows; r++) {
        const tableCells = [];
        for (let c = 0; c < cols; c++) {
            tableCells.push(
                <td
                    width={width/cols}
                    height={height/rows}
                >{cells[r][c].state}<br />{cells[r][c].neighbours}</td>
            );
        }
        tableRows.push(<tr>{tableCells}</tr>);
    }

    return <table><tbody>{tableRows}</tbody></table>;
};

class App extends Component {
    state = {
        cells: createCells(),
    }

    render() {
        return (
            <><Grid cells={this.state.cells} /></>
        );
    }
}

export default App;