/**
 * The academy's real courses and modules, from the NVQ curricula in
 * resources/courses. Used by the dev seed and by seed-courses.ts (production).
 * Module codes drop the curriculum prefix (093S002M01 → M01); the full
 * competency standards code is in the course description.
 */
export interface CourseData {
  code: string;
  name: string;
  description: string;
  /** In curriculum order. `hours` is null where the curriculum gives none. */
  modules: { code: string; title: string; hours: number | null }[];
}

const employabilityModules = [
  { code: 'EMPM01', title: 'Workplace Information Management', hours: null },
  { code: 'EMPM02', title: 'Workplace Communication Management', hours: null },
  {
    code: 'EMPM03',
    title: 'Plan Work to be Performed at Workplace',
    hours: null,
  },
  { code: 'EMPM04', title: 'Problem Solving and Decision-Making', hours: null },
];

export const courses: CourseData[] = [
  {
    code: 'HD',
    name: 'Hair Dressing',
    description:
      'NVQ Level 4 · Competency standards code 093S002 · 514 hours institutional, then 6 months on the job.',
    modules: [
      {
        code: 'M01',
        title:
          'Special qualities and attitudes need to be developed by a Hairdresser',
        hours: 10,
      },
      {
        code: 'M02',
        title: 'Maintenance of Machinery, Tools and Equipment',
        hours: 16,
      },
      {
        code: 'M03',
        title: 'Introduction to shampoo and conditioning',
        hours: 27,
      },
      {
        code: 'M04',
        title: 'Maintenance of safe and pleasant salon environment',
        hours: 12,
      },
      { code: 'M05', title: "Client's consultation services", hours: 21 },
      { code: 'M06', title: 'Hair and scalp treatments', hours: 20 },
      { code: 'M07', title: 'Cutting and setting ladies hair', hours: 90 },
      {
        code: 'M08',
        title: "Cutting and setting of men's hair, moustache and beard",
        hours: 50,
      },
      { code: 'M09', title: 'Styling and dressing hair', hours: 45 },
      { code: 'M10', title: 'Permanent wave (perm)', hours: 55 },
      {
        code: 'M11',
        title: 'Hair relaxing / straightening services',
        hours: 31,
      },
      { code: 'M12', title: 'Colour hair', hours: 65 },
      {
        code: 'M13',
        title: 'Promotion and selling of hair care products and services',
        hours: 10,
      },
      { code: 'M14', title: 'Hairdressing salon management', hours: 20 },
      { code: 'BM01', title: 'Communication skills for workplace', hours: 12 },
      { code: 'BM02', title: 'Team Work', hours: 4 },
      {
        code: 'BM03',
        title: 'Occupational Safety & Health and Environmental Aspects',
        hours: 26,
      },
    ],
  },
  {
    code: 'BD',
    name: 'Bridal Dressing',
    description: 'NVQ Level 4 · Competency standards code 093S008 · 444 hours.',
    modules: [
      {
        code: 'M01',
        title:
          'Special qualities and attitudes need to be developed by Bridal dresser',
        hours: 12,
      },
      { code: 'M02', title: "Client's consultation services", hours: 18 },
      { code: 'M03', title: 'Hair setting techniques', hours: 30 },
      { code: 'M04', title: 'Hair styles and techniques', hours: 54 },
      { code: 'M05', title: 'Bridal Makeup', hours: 72 },
      { code: 'M06', title: 'Bridal attire and its draping', hours: 54 },
      { code: 'M07', title: 'Bridal Dressing', hours: 78 },
      {
        code: 'M08',
        title: 'Maintenance of Machinery, Tools and Equipment',
        hours: 18,
      },
      { code: 'M09', title: 'Maintenance of Bridal Studio', hours: 18 },
      { code: 'M10', title: 'Bridal studio management', hours: 24 },
      {
        code: 'BM01',
        title: 'Practice workplace communication and interpersonal relations',
        hours: 12,
      },
      {
        code: 'BM02',
        title: 'Apply occupational literacy and numeracy',
        hours: 18,
      },
      { code: 'BM03', title: 'Work in team', hours: 12 },
      {
        code: 'BM04',
        title: 'Practice occupational health and safety measures',
        hours: 24,
      },
    ],
  },
  {
    code: 'BT',
    name: 'Beautician',
    description:
      'Competency standards code 093S001 · 466 hours institutional, then 6 months on the job.',
    modules: [
      {
        code: 'BM01',
        title:
          'Special qualities and attitudes to be developed by a Beautician',
        hours: 12,
      },
      {
        code: 'BM02',
        title: 'Maintenance of Machinery Tools and Equipment',
        hours: 18,
      },
      {
        code: 'BM03',
        title: 'Occupational Health and Safety Procedures and Practice',
        hours: 36,
      },
      {
        code: 'M01',
        title: 'Maintenance of safe and pleasant Beauty salon environment',
        hours: 12,
      },
      { code: 'M02', title: 'Reception Duties', hours: 18 },
      { code: 'M03', title: 'Client Consultation', hours: 18 },
      { code: 'M04', title: 'Superfluous Hair Removal', hours: 30 },
      { code: 'M05', title: 'Make-Up Application', hours: 48 },
      { code: 'M06', title: 'Manicure and pedicure', hours: 88 },
      { code: 'M07', title: 'Skin analysis', hours: 24 },
      { code: 'M08', title: 'Skin care treatments', hours: 138 },
      { code: 'M09', title: 'Salon Management', hours: 24 },
    ],
  },
  {
    code: 'BB',
    name: 'Barbering',
    description:
      'Modules from the Hair Dressing curriculum (093S002) · 145 hours, plus M01.',
    modules: [
      {
        code: 'M01',
        title:
          'Special qualifications & attitudes needs to be developed by Hairdresser',
        hours: null,
      },
      {
        code: 'BM03',
        title: 'Occupational Safety & Health and Environmental Aspects',
        hours: 26,
      },
      { code: 'BM01', title: 'Communication skills for workplace', hours: 12 },
      { code: 'BM02', title: 'Team Work', hours: 4 },
      {
        code: 'M04',
        title: 'Maintenance of safe and pleasant salon environment',
        hours: 12,
      },
      { code: 'M05', title: "Client's consultation services", hours: 21 },
      { code: 'M06', title: 'Hair and scalp treatments', hours: 20 },
      {
        code: 'M08',
        title: "Cutting and setting of men's hair, moustache and beard",
        hours: 50,
      },
    ],
  },
  {
    code: 'CLV',
    name: 'Cosmetology - NVQ Level 5',
    description: 'NVQ Level 5 · Curriculum code 093C001.',
    modules: [
      { code: 'M01', title: 'Introduction to cosmetology', hours: null },
      {
        code: 'M02',
        title: 'Health, safety and first aid in cosmetology services',
        hours: null,
      },
      {
        code: 'M03',
        title:
          'Role of cosmetologist with respect to identification of skin, hair and nail diseases and disorders',
        hours: null,
      },
      {
        code: 'M04',
        title: 'Cosmetic products for skin, nail and hair services',
        hours: null,
      },
      { code: 'M05', title: 'Advanced skin care', hours: null },
      {
        code: 'M06',
        title: 'Advanced hair treatments and advance hair dressing',
        hours: null,
      },
      {
        code: 'M07',
        title:
          'Customer care, market promotions and interpersonal relations in the salon',
        hours: null,
      },
      { code: 'M08', title: 'Advanced hand care and foot care', hours: null },
      {
        code: 'M09',
        title: 'Regulatory requirements in hair & beauty industry',
        hours: null,
      },
      {
        code: 'M10',
        title: 'Infrastructure, equipment & resource management',
        hours: null,
      },
      ...employabilityModules,
    ],
  },
  {
    code: 'CLVI',
    name: 'Cosmetology - NVQ Level 6',
    description: 'NVQ Level 6 · Curriculum code 093C001.',
    modules: [
      {
        code: 'M11',
        title: 'Nutrition, diet and exercise related to cosmetology',
        hours: null,
      },
      {
        code: 'M12',
        title:
          'Anatomy and physiology of skin, hair and nails and systems of the body',
        hours: null,
      },
      { code: 'M13', title: 'Advanced makeup', hours: null },
      { code: 'M14', title: 'Staff training and development', hours: null },
      {
        code: 'M15',
        title: 'Organization of competition and shows',
        hours: null,
      },
      { code: 'M16', title: 'Marketing of cosmetology services', hours: null },
      { code: 'M17', title: 'Entrepreneurship in cosmetology', hours: null },
      {
        code: 'M18',
        title: 'Advanced nail technology and nail artistry',
        hours: null,
      },
      {
        code: 'M19',
        title: 'Special skin care services using electrotherapy',
        hours: null,
      },
      {
        code: 'M20',
        title: 'Special hair care services & fantasy hair styles artistry',
        hours: null,
      },
      ...employabilityModules,
    ],
  },
];
