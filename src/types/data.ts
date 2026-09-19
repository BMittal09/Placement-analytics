export type OfferType = "P" | "I" | "P+I";
export type DriveType = "Placement" | "Internship" | "Both";

export interface BranchCount {
  code: string;
  count: number;
}

export interface MoneyStats {
  max: number | null;
  min: number | null;
  avg: number | null;
  offerCount: number;
}

export interface Company {
  id: string;
  name: string;
  category: string | null;
  dateOfVisit: string | null; // ISO yyyy-mm-dd
  driveType: DriveType;
  offerTypes: OfferType[];
  studentCount: number;
  branches: BranchCount[];
  branchCount: number;
  ctc: MoneyStats;
  stipend: MoneyStats;
}

export interface BranchStat {
  code: string;
  label: string;
  studentsPlaced: number;
  companiesHiring: number;
  avgPackage: number | null;
  medianPackage: number | null;
  maxPackage: number | null;
  minPackage: number | null;
  packageOfferCount: number;
}

export interface TimelinePoint {
  month: string; // YYYY-MM
  companies: number;
  students: number;
  maxPackage: number;
}

export interface SalaryBand {
  label: string;
  count: number;
}

export interface Kpis {
  totalCompanies: number;
  totalStudentOffers: number;
  totalStudentsPlaced: number;
  totalStudentsInterned: number;
  highestPackage: number | null;
  lowestPackage: number | null;
  avgPackage: number | null;
  medianPackage: number | null;
  totalOffers: number;
  numBranches: number;
  companiesPlacementOnly: number;
  companiesInternshipOnly: number;
  companiesBoth: number;
  dateRange: { earliest: string | null; latest: string | null };
}

export interface MlComparisonModel {
  name: string;
  cvR2Mean: number;
  cvR2Std: number;
  shipped: boolean;
}

export interface MlPredictor {
  trained: boolean;
  reason?: string;
  algorithm?: string;
  targetTransform?: string;
  trainedOnRows?: number;
  excludedUnknownCategoryRows?: number;
  features?: string[];
  branchesUsed?: string[];
  categoriesUsed?: string[];
  driveSizeStandardization?: { mean: number; std: number };
  branchDiversityStandardization?: { mean: number; std: number };
  coefficients?: Record<string, number>;
  intercept?: number;
  trainR2?: number;
  testR2?: number;
  testMAE?: number;
  crossValidation?: {
    folds: number;
    strategy: string;
    groupedBy: string;
    uniqueGroups: number;
    ridgeR2Mean: number;
    ridgeR2Std: number;
  };
  holdout?: {
    strategy: string;
    groupedBy: string;
    testFraction: number;
    trainGroups: number;
    testGroups: number;
  };
  comparisonModels?: MlComparisonModel[];
  caveat?: string;
}

export interface Anomaly {
  company: string;
  companyId: string;
  branch: string;
  value: number;
  peerAverage: number;
  zScore: number;
  direction: "high" | "low";
}

export interface PlacementData {
  generatedAt: string;
  kpis: Kpis;
  companies: Company[];
  branches: BranchStat[];
  timeline: TimelinePoint[];
  salaryBands: SalaryBand[];
  dataQuality: string[];
  mlPredictor: MlPredictor;
  anomalies: Anomaly[];
}

export interface Filters {
  search: string;
  branches: string[]; // branch codes, OR'd together
  categories: string[];
  minPackage: number | null; // rupees
  maxPackage: number | null;
  months: string[]; // YYYY-MM, OR'd together
  minStudents: number | null;
  maxStudents: number | null;
  driveType: DriveType | "Any";
}

export const EMPTY_FILTERS: Filters = {
  search: "",
  branches: [],
  categories: [],
  minPackage: null,
  maxPackage: null,
  months: [],
  minStudents: null,
  maxStudents: null,
  driveType: "Any",
};
