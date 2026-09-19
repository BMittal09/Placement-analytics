import type { MlPredictor } from "../types/data";

export interface PredictorInput {
  branch: string;
  category: string;
  driveSize: number; // expected number of students the company hires
  branchDiversity?: number; // how many branches the company hires from (defaults to 1)
}

export interface PredictorOutput {
  predicted: number;
  low: number;
  high: number;
}

/**
 * Re-implements the trained Ridge regression as a plain dot product.
 * The model was fit in Python (scripts/process.py) on log1p(CTC), and its
 * coefficients were exported into placementData.json — no ML runtime
 * needed in the browser, this is just arithmetic against those
 * coefficients, followed by expm1() to undo the log transform.
 */
export function predictPackage(model: MlPredictor, input: PredictorInput): PredictorOutput | null {
  if (!model.trained || !model.coefficients || model.intercept === undefined) return null;

  const { coefficients, intercept, driveSizeStandardization, branchDiversityStandardization } = model;
  let total = intercept;

  const branchKey = `branch_${input.branch}`;
  const catKey = `cat_${input.category}`;

  total += coefficients[branchKey] ?? 0;
  total += coefficients[catKey] ?? 0;

  if (driveSizeStandardization) {
    const z = (input.driveSize - driveSizeStandardization.mean) / (driveSizeStandardization.std || 1);
    total += (coefficients["driveSize_z"] ?? 0) * z;
  }

  if (branchDiversityStandardization) {
    const bd = input.branchDiversity ?? 1;
    const z = (bd - branchDiversityStandardization.mean) / (branchDiversityStandardization.std || 1);
    total += (coefficients["branchDiversity_z"] ?? 0) * z;
  }

  // Model was trained on log1p(CTC); undo that to get back to rupees.
  const predictedRupees = model.targetTransform === "log1p" ? Math.expm1(total) : total;

  // Test MAE (already in rupee space) gives us an honest, data-driven
  // error band rather than an arbitrary +/- percentage.
  const errorBand = model.testMAE ?? predictedRupees * 0.25;

  return {
    predicted: Math.max(0, Math.round(predictedRupees)),
    low: Math.max(0, Math.round(predictedRupees - errorBand)),
    high: Math.round(predictedRupees + errorBand),
  };
}
