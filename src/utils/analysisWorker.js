import { calculateCTT, calculateIRT2PL, calculateCDM } from './psychometricsEngine.js';
import { 
  calculateIndependentT, 
  calculateDependentT, 
  calculateCorrelation, 
  calculateOneWayANOVA, 
  calculateMultipleRegression, 
  calculateModeration, 
  calculateMediation, 
  calculateChiSquare, 
  calculateReliability 
} from './statsEngine.js';
import {
  calculateSPC,
  calculatePCA,
  calculateGageRR,
  calculateSamplingPlan,
  calculateHotellingT2,
  calculateDoubleSamplingPlan,
  calculateFactorialDOE
} from './industrialEngine.js';

self.onmessage = function(e) {
  const { type, payload, id } = e.data;
  let result = null;

  try {
    switch (type) {
      // Psychometrics
      case 'calculateCTT':
        result = calculateCTT(payload.responseMatrix, payload.itemNames);
        break;
      case 'calculateIRT2PL':
        result = calculateIRT2PL(payload.responseMatrix, payload.itemNames);
        break;
      case 'calculateCDM':
        result = calculateCDM(payload.responseMatrix, payload.itemNames, payload.qMatrix, payload.attributeNames);
        break;

      // Stats
      case 'calculateIndependentT':
        result = calculateIndependentT(payload.group1, payload.group2);
        break;
      case 'calculateDependentT':
        result = calculateDependentT(payload.pre, payload.post);
        break;
      case 'calculateCorrelation':
        result = calculateCorrelation(payload.x, payload.y);
        break;
      case 'calculateOneWayANOVA':
        result = calculateOneWayANOVA(payload.groupsData);
        break;
      case 'calculateMultipleRegression':
        result = calculateMultipleRegression(payload.IVsData, payload.YData, payload.ivNames, payload.options);
        break;
      case 'calculateModeration':
        result = calculateModeration(payload.IVData, payload.ModData, payload.YData, payload.modName, payload.options);
        break;
      case 'calculateMediation':
        result = calculateMediation(payload.X, payload.M, payload.Y, payload.options);
        break;
      case 'calculateChiSquare':
        result = calculateChiSquare(payload.colX, payload.colY);
        break;
      case 'calculateReliability':
        result = calculateReliability(payload.columns);
        break;

      // Industrial
      case 'calculateSPC':
        result = calculateSPC(payload.rawValues, payload.chartType, payload.subgroupSize, payload.params);
        break;
      case 'calculatePCA':
        result = calculatePCA(payload.rawValues, payload.usl, payload.lsl, payload.target, payload.subgroupSize);
        break;
      case 'calculateGageRR':
        result = calculateGageRR(payload.rawMeasurements);
        break;
      case 'calculateSamplingPlan':
        result = calculateSamplingPlan(payload.N, payload.n, payload.c);
        break;
      case 'calculateHotellingT2':
        result = calculateHotellingT2(payload.data);
        break;
      case 'calculateDoubleSamplingPlan':
        result = calculateDoubleSamplingPlan(payload.N, payload.n1, payload.c1, payload.r1, payload.n2, payload.c2);
        break;
      case 'calculateFactorialDOE':
        result = calculateFactorialDOE(payload.factors, payload.data);
        break;

      default:
        console.error('Unknown calculation type:', type);
    }
    
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};
