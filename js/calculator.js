/* ===================================================
   Calculator Module
   =================================================== */

let calcValue = '0';
let calcPrevValue = '';
let calcOperator = '';
let calcNewInput = true;

function updateCalcDisplay() {
  const result = document.getElementById('calcResult');
  const expression = document.getElementById('calcExpression');
  if (result) result.textContent = calcValue;
  if (expression) expression.textContent = calcPrevValue && calcOperator 
    ? `${calcPrevValue} ${getOpSymbol(calcOperator)}` : '';
}

function getOpSymbol(op) {
  const symbols = { '/': '÷', '*': '×', '-': '−', '+': '+' };
  return symbols[op] || op;
}

function calcDigit(d) {
  if (calcNewInput) {
    calcValue = d;
    calcNewInput = false;
  } else {
    if (calcValue === '0' && d !== '.') {
      calcValue = d;
    } else {
      calcValue += d;
    }
  }
  updateCalcDisplay();
}

function calcDecimal() {
  if (calcNewInput) {
    calcValue = '0.';
    calcNewInput = false;
  } else if (!calcValue.includes('.')) {
    calcValue += '.';
  }
  updateCalcDisplay();
}

function calcOp(op) {
  if (calcPrevValue && calcOperator && !calcNewInput) {
    calcEquals();
  }
  calcPrevValue = calcValue;
  calcOperator = op;
  calcNewInput = true;
  updateCalcDisplay();
}

function calcEquals() {
  if (!calcPrevValue || !calcOperator) return;
  
  const a = parseFloat(calcPrevValue);
  const b = parseFloat(calcValue);
  let result = 0;

  switch (calcOperator) {
    case '+': result = a + b; break;
    case '-': result = a - b; break;
    case '*': result = a * b; break;
    case '/': result = b !== 0 ? a / b : 'Error'; break;
  }

  calcValue = result === 'Error' ? 'Error' : String(parseFloat(result.toFixed(10)));
  calcPrevValue = '';
  calcOperator = '';
  calcNewInput = true;
  updateCalcDisplay();
}

function calcClear() {
  calcValue = '0';
  calcPrevValue = '';
  calcOperator = '';
  calcNewInput = true;
  updateCalcDisplay();
}

function calcToggleSign() {
  if (calcValue !== '0' && calcValue !== 'Error') {
    calcValue = String(-parseFloat(calcValue));
    updateCalcDisplay();
  }
}

function calcPercent() {
  if (calcValue !== 'Error') {
    calcValue = String(parseFloat(calcValue) / 100);
    updateCalcDisplay();
  }
}
