import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';

interface CalculationResult {
    summary: {
        finalAmount: number;
        totalPrincipal: number;
        totalInterest: number;
    };
    breakdown: {
        year: number;
        principal: number;
        interest: number;
        finalAmount: number;
    }[];
}

const formatCurrency = (value: number, withSymbol: boolean = false) => {
    const formatted = Math.round(value).toLocaleString('ko-KR');
    return withSymbol ? `₩${formatted}` : formatted;
};

const App = () => {
    const [initialPrincipal, setInitialPrincipal] = useState('10000000');
    const [monthlyDeposit, setMonthlyDeposit] = useState('1000000');
    const [period, setPeriod] = useState('40');
    const [periodUnit, setPeriodUnit] = useState<'years' | 'months'>('years');
    const [rate, setRate] = useState('12');
    const [rateUnit, setRateUnit] = useState<'annual' | 'monthly'>('annual');
    
    const [result, setResult] = useState<CalculationResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const resultRef = useRef<HTMLDivElement>(null);

    const handleCalculate = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setResult(null);

        // Calculation logic wrapped in setTimeout to allow UI update for loading spinner
        setTimeout(() => {
            const P0 = parseFloat(initialPrincipal) || 0;
            const d = parseFloat(monthlyDeposit) || 0;
            const periodValue = parseInt(period) || 0;
            const rateValue = parseFloat(rate) || 0;

            const totalMonths = periodUnit === 'years' ? periodValue * 12 : periodValue;
            const totalYears = Math.ceil(totalMonths / 12);
            const annualRate = rateUnit === 'annual' ? rateValue / 100 : (rateValue / 100) * 12;

            const breakdown: CalculationResult['breakdown'] = [];
            let currentAmount = P0;
            let totalPrincipalInvested = P0;
            
            // Per the image: deposits start from the second month
            const firstYearMonthsOfDeposit = 11; 
            const regularYearMonthsOfDeposit = 12;
            let totalDepositsMade = 0;


            for (let y = 1; y <= totalYears; y++) {
                const isFirstYear = y === 1;
                const principalAtYearStart = currentAmount;
                
                const monthsInThisYear = (y * 12 > totalMonths) ? totalMonths % 12 : 12;
                if (monthsInThisYear === 0 && totalMonths > 0) continue; // handles cases like 24 months = 2 years exactly

                let depositsThisYear = 0;
                let interestOnDeposits = 0;

                if (isFirstYear) {
                    const monthsToDeposit = Math.min(monthsInThisYear - 1, firstYearMonthsOfDeposit);
                    if(monthsToDeposit > 0){
                        depositsThisYear = d * monthsToDeposit;
                        const interestMonthsSum = (monthsToDeposit * (monthsToDeposit + 1)) / 2;
                        interestOnDeposits = d * (annualRate / 12) * interestMonthsSum;
                        totalDepositsMade += monthsToDeposit;
                    }
                } else {
                    depositsThisYear = d * Math.min(monthsInThisYear, regularYearMonthsOfDeposit);
                    const interestMonthsSum = (monthsInThisYear * (monthsInThisYear + 1)) / 2;
                    interestOnDeposits = d * (annualRate / 12) * interestMonthsSum;
                    totalDepositsMade += Math.min(monthsInThisYear, regularYearMonthsOfDeposit);
                }

                totalPrincipalInvested += depositsThisYear;

                const interestOnPrincipal = principalAtYearStart * annualRate * (monthsInThisYear/12);
                const totalInterestThisYear = interestOnPrincipal + interestOnDeposits;
                
                currentAmount += depositsThisYear + totalInterestThisYear;

                breakdown.push({
                    year: y,
                    principal: principalAtYearStart + depositsThisYear,
                    interest: totalInterestThisYear,
                    finalAmount: currentAmount,
                });
            }

            const finalTotalPrincipal = P0 + (d * totalDepositsMade);
            const totalInterest = currentAmount - finalTotalPrincipal;

            setResult({
                summary: {
                    finalAmount: currentAmount,
                    totalPrincipal: finalTotalPrincipal,
                    totalInterest,
                },
                breakdown,
            });
            setIsLoading(false);
        }, 50);
    };

    const handleDownload = async () => {
        if (!resultRef.current) return;
        
        const canvas = await html2canvas(resultRef.current, {
            useCORS: true,
            scale: 2,
            backgroundColor: '#ffffff'
        });
        const link = document.createElement('a');
        link.download = 'compound-interest-result.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="calculator-app">
            <h1>적립식 복리 계산기</h1>
            <form onSubmit={handleCalculate}>
                <div className="form-group">
                    <label htmlFor="initial-principal">시작 금액 (₩)</label>
                    <input id="initial-principal" type="number" value={initialPrincipal} onChange={(e) => setInitialPrincipal(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label htmlFor="monthly-deposit">매월 적립 금액 (₩)</label>
                    <p className="description">* 두 번째 달부터 원금에 가산됩니다.</p>
                    <input id="monthly-deposit" type="number" value={monthlyDeposit} onChange={(e) => setMonthlyDeposit(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>투자 기간</label>
                    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                        <input id="period" type="number" value={period} onChange={(e) => setPeriod(e.target.value)} required style={{flex: 1}}/>
                        <div className="radio-group">
                            <label><input type="radio" name="periodUnit" value="years" checked={periodUnit === 'years'} onChange={() => setPeriodUnit('years')} /> 년</label>
                            <label><input type="radio" name="periodUnit" value="months" checked={periodUnit === 'months'} onChange={() => setPeriodUnit('months')} /> 개월</label>
                        </div>
                    </div>
                </div>
                 <div className="form-group">
                    <label>이자율</label>
                     <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                        <input id="rate" type="number" value={rate} onChange={(e) => setRate(e.target.value)} required step="0.1" style={{flex: 1}} placeholder="예: 12" />
                        <div className="radio-group">
                            <label><input type="radio" name="rateUnit" value="annual" checked={rateUnit === 'annual'} onChange={() => setRateUnit('annual')} /> 년</label>
                            <label><input type="radio" name="rateUnit" value="monthly" checked={rateUnit === 'monthly'} onChange={() => setRateUnit('monthly')} /> 월</label>
                        </div>
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="compounding-method">복리 방식</label>
                    <input id="compounding-method" type="text" value="연복리" disabled />
                </div>
                <button type="submit" className="calculate-btn" disabled={isLoading}>
                    {isLoading ? <div className="loading-spinner"></div> : '계산하기'}
                </button>
            </form>

            {result && (
                <>
                    <div className="result-container" ref={resultRef}>
                        <div className="result-summary">
                            <div className="summary-card">
                                <span className="label">총 수익</span>
                                <span className="value profit">{formatCurrency(result.summary.totalInterest, true)}</span>
                            </div>
                            <div className="summary-card">
                                <span className="label">총 투자금</span>
                                <span className="value">{formatCurrency(result.summary.totalPrincipal, true)}</span>
                            </div>
                             <div className="summary-card">
                                <span className="label">최종 금액</span>
                                <span className="value final-amount">{formatCurrency(result.summary.finalAmount, true)}</span>
                            </div>
                        </div>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>년</th>
                                        <th>원금 (₩)</th>
                                        <th>수익 (₩)</th>
                                        <th>최종 금액 (₩)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.breakdown.map((row, index) => (
                                        <tr key={row.year} className={(row.year % 5 === 0) ? 'highlight' : ''}>
                                            <td>{row.year}</td>
                                            <td>{formatCurrency(row.principal)}</td>
                                            <td className="profit-cell">+{formatCurrency(row.interest)}</td>
                                            <td className="final-amount-cell">{formatCurrency(row.finalAmount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <button onClick={handleDownload} className="calculate-btn download-button">
                        결과 이미지 다운로드
                    </button>
                </>
            )}
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
