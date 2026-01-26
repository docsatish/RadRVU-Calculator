
import { StudyDefinition } from './types';

// Approximate Work RVUs based on typical CMS values
export const RADIOLOGY_STUDY_DB: StudyDefinition[] = [
  { cpt: '70450', name: 'CT Head w/o Contrast', rvu: 1.02, category: 'CT' },
  { cpt: '70486', name: 'CT Maxillofacial w/o Contrast', rvu: 1.13, category: 'CT' },
  { cpt: '71250', name: 'CT Chest w/o Contrast', rvu: 1.16, category: 'CT' },
  { cpt: '71260', name: 'CT Chest w/ Contrast', rvu: 1.24, category: 'CT' },
  { cpt: '74150', name: 'CT Abdomen w/o Contrast', rvu: 1.19, category: 'CT' },
  { cpt: '74160', name: 'CT Abdomen w/ Contrast', rvu: 1.27, category: 'CT' },
  { cpt: '74176', name: 'CT Abdomen/Pelvis w/o Contrast', rvu: 1.74, category: 'CT' },
  { cpt: '74177', name: 'CT Abdomen/Pelvis w/ Contrast', rvu: 1.82, category: 'CT' },
  { cpt: '74178', name: 'CT Abdomen/Pelvis w/ & w/o Contrast', rvu: 1.96, category: 'CT' },
  { cpt: '72125', name: 'CT Cervical Spine w/o Contrast', rvu: 1.14, category: 'CT' },
  { cpt: '72131', name: 'CT Lumbar Spine w/o Contrast', rvu: 1.14, category: 'CT' },
  
  { cpt: '71045', name: 'XR Chest 1 View', rvu: 0.22, category: 'X-Ray' },
  { cpt: '71046', name: 'XR Chest 2 Views', rvu: 0.26, category: 'X-Ray' },
  { cpt: '73560', name: 'XR Knee 1-2 Views', rvu: 0.18, category: 'X-Ray' },
  { cpt: '73030', name: 'XR Shoulder 2+ Views', rvu: 0.19, category: 'X-Ray' },
  { cpt: '72040', rvu: 0.22, name: 'XR Cervical Spine 2-3 Views', category: 'X-Ray' },
  { cpt: '72100', rvu: 0.23, name: 'XR Lumbar Spine 2-3 Views', category: 'X-Ray' },

  { cpt: '70551', name: 'MRI Brain w/o Contrast', rvu: 1.48, category: 'MRI' },
  { cpt: '70553', name: 'MRI Brain w/ & w/o Contrast', rvu: 2.15, category: 'MRI' },
  { cpt: '72141', name: 'MRI Cervical Spine w/o Contrast', rvu: 1.48, category: 'MRI' },
  { cpt: '72148', name: 'MRI Lumbar Spine w/o Contrast', rvu: 1.48, category: 'MRI' },
  { cpt: '73221', name: 'MRI Joint Upper Ext w/o Contrast', rvu: 1.35, category: 'MRI' },
  { cpt: '73721', name: 'MRI Joint Lower Ext w/o Contrast', rvu: 1.35, category: 'MRI' },

  { cpt: '76700', name: 'US Abdomen Complete', rvu: 1.09, category: 'Ultrasound' },
  { cpt: '76705', name: 'US Abdomen Limited', rvu: 0.81, category: 'Ultrasound' },
  { cpt: '76830', name: 'US Pelvis Transvaginal', rvu: 0.89, category: 'Ultrasound' },
  { cpt: '76856', name: 'US Pelvis Complete', rvu: 0.89, category: 'Ultrasound' },
  { cpt: '93970', name: 'US Duplex Venous Extremity Bilateral', rvu: 1.32, category: 'Ultrasound' },
  { cpt: '76536', name: 'US Thyroid/Neck', rvu: 0.68, category: 'Ultrasound' },
];

export const DEFAULT_RVU_RATE = 35.00; // Example: $35 per RVU
