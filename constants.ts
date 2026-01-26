
import { StudyDefinition } from './types';

export const INITIAL_STUDY_DB: StudyDefinition[] = [
  { cpt: '77067', name: 'MAMMOGRAM SCREENING DIGITAL BILAT 3D TOMO', rvu: 1.36, category: 'Other' },
  { cpt: '77066', name: 'MAMMO DIAGNOSTIC BILATERAL DIGITAL 3D TOMO', rvu: 2.2, category: 'Other' },
  { cpt: '77065', name: 'MAMMO DIAGNOSTIC UNILATERAL DIGITAL 3D TOMO', rvu: 1.98, category: 'Other' },
  { cpt: '76641', name: 'US BREAST BILATERAL COMPLETE', rvu: 2.06, category: 'Ultrasound' },
  { cpt: '76642', name: 'US BREAST BILATERAL LIMITED', rvu: 1.92, category: 'Ultrasound' },
  { cpt: '77049', name: 'MRI BREAST BILATERAL WITH AND WITHOUT CONTRAST', rvu: 2.24, category: 'MRI' },
  { cpt: '19081', name: 'US GUIDE BREAST BX PLACE/ASPIRATE', rvu: 4.53, category: 'Other' },
  { cpt: '70498', name: 'CT Angio Neck w/ or wo + w/ Cont', rvu: 1.75, category: 'CT' },
  { cpt: '72126', name: 'CT Cervical Spine wo Cont', rvu: 1.22, category: 'CT' },
  { cpt: '71250', name: 'CT Chest wo Cont', rvu: 1.0, category: 'CT' },
  { cpt: '71260', name: 'CT Chest w/ Cont', rvu: 1.22, category: 'CT' },
  { cpt: '71270', name: 'CT Chest wo + w/ Cont', rvu: 1.27, category: 'CT' },
  { cpt: '70491', name: 'CT Neck w/ Cont', rvu: 1.38, category: 'CT' },
  { cpt: '70492', name: 'CT Neck wo + w/ Cont', rvu: 1.62, category: 'CT' },
  { cpt: '70486', name: 'CT Sinus Maxillofacial wo Cont', rvu: 0.85, category: 'CT' },
  { cpt: '70551', name: 'MRI Head Brain wo Cont', rvu: 1.48, category: 'MRI' },
  { cpt: '70552', name: 'MRI Head Brain w/ Cont', rvu: 1.78, category: 'MRI' },
  { cpt: '70553', name: 'MRI Head Brain wo + w/ Cont', rvu: 2.29, category: 'MRI' },
  { cpt: '72148', name: 'MRI Lumbar Spine wo Cont', rvu: 1.48, category: 'MRI' },
  { cpt: '72141', name: 'MRI Cervical Spine wo Cont', rvu: 1.48, category: 'MRI' },
  { cpt: '93880', name: 'Ultrasound Carotids', rvu: 0.8, category: 'Ultrasound' }
];

export const DEFAULT_RVU_RATE = 35.00;
