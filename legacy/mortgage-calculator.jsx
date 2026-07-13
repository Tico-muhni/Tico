import React, { useState } from 'react';
import { Pie } from 'react-chartjs-2';

// עיצוב מותאם אישית
const brandColors = {
  primary: '#1D3557',
  secondary: '#457B9D',
  accent: '#A8DADC',
  background: '#F1FAEE',
  button: '#E63946',
  text: '#333333',
};

const logoURL = '/path/to/your/logo.png'; // עדכן כאן את מיקום הלוגו

const MortgageCalculator = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    monthlyIncome: '',
    additionalIncome: '',
    obligations: '',
    age: '',
    propertyValue: '',
    savingsAmount: '',
    riskTolerance: 'medium',
    preferredLength: '30',
  });

  const [results, setResults] = useState(null);

  const validateInputs = () => {
    for (const key in formData) {
      if (formData[key] === '' || isNaN(Number(formData[key]))) {
        return false;
      }
    }
    return true;
  };

  const calculateDisposableIncome = () => {
    const totalIncome = Number(formData.monthlyIncome) + Number(formData.additionalIncome);
    const monthlyObligations = Number(formData.obligations);
    return totalIncome - monthlyObligations;
  };

  const calculateMaxMortgage = () => {
    const disposableIncome = calculateDisposableIncome();
    const maxMonthlyPayment = disposableIncome * 0.38;
    return maxMonthlyPayment * 200; // Approximation for 30 years
  };

  const generateMortgageMix = () => {
    const maxMortgage = calculateMaxMortgage();
    const mix = {
      prime: 0.3,
      fixed: 0.4,
      linked: 0.3,
      maxAmount: maxMortgage,
      monthlyPayment: calculateDisposableIncome() * 0.38,
    };

    switch (formData.riskTolerance) {
      case 'low':
        mix.fixed = 0.6;
        mix.linked = 0.3;
        mix.prime = 0.1;
        break;
      case 'medium':
        mix.fixed = 0.4;
        mix.linked = 0.3;
        mix.prime = 0.3;
        break;
      case 'high':
        mix.fixed = 0.2;
        mix.linked = 0.3;
        mix.prime = 0.5;
        break;
    }

    return mix;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
    } else {
      if (!validateInputs()) {
        alert('אנא מלא את כל השדות בצורה תקינה.');
        return;
      }
      const results = generateMortgageMix();
      setResults(results);
    }
  };

  const renderResults = () => {
    if (!results) return null;

    const pieData = {
      labels: ['פריים', 'קבועה', 'צמודה'],
      datasets: [
        {
          data: [results.prime * 100, results.fixed * 100, results.linked * 100],
          backgroundColor: [brandColors.accent, brandColors.primary, brandColors.secondary],
        },
      ],
    };

    return (
      <div style={{ backgroundColor: brandColors.background, padding: '20px', borderRadius: '8px' }}>
        <h3 style={{ color: brandColors.primary, fontWeight: 'bold' }}>
          התוצאות שלך
        </h3>
        <p>
          <strong>סכום משכנתה מקסימלי:</strong>{' '}
          {new Intl.NumberFormat('he-IL').format(Math.round(results.maxAmount))} ₪
        </p>
        <div style={{ width: '300px', margin: '20px auto' }}>
          <Pie data={pieData} />
        </div>
        <p>
          <strong>החזר חודשי מקסימלי:</strong>{' '}
          {new Intl.NumberFormat('he-IL').format(Math.round(results.monthlyPayment))} ₪
        </p>
        <button
          onClick={() => alert('נשמח לעזור לך בבניית המשכנתה שלך! צור קשר עכשיו.')}
          style={{
            backgroundColor: brandColors.button,
            color: 'white',
            padding: '10px 20px',
            border
