# Wintskill Salon Academy - Student Management System

## Business Requirements

- This web application is for Wintskill Salon Academy to manage their students, courses, and batch intakes.
- It should also consist with a learning management system (LMS) to manage course materials, assignments, and student progress.
- There should be a login system for students, teachers, and admin users. Each user type should have different access levels and permissions.
- Admin users should be able to manage students, courses, and batch intakes.
- Admin user should be able to start a new batch intake and assign students to the batch.
- Admin user should be able to register student details using the physical registration form which consists of student name, email, phone number, address, course enrolled, batch intake, and other relevant details.
- System should be able to generate a student id. It should start with course code, followed by batch intake code, and then a unique number. For example, if the course code is "HSC" and the batch intake code is "2023", the student id should be "HSC2023001" for the first student enrolled in that batch. (For now, I will change the logic later, but please make it flexible to change the logic later)
- Admin should be able to mark the class dates for the batch intake and assign teachers to each class.
- Admin should be able to mark attendance for students in each class days. (Currently this is done manually using a physical attendance sheet, but the system should be able to manage it digitally)
- Use a Calendar based approach for the System to manage the class dates, attendance, and other relevant events. Admin should be able to view the calendar and manage the events easily.
- Admin should be able to manage course materials and assignments for each course.
- For a course there are modules with modules codes. Each module has a set of course materials and assignments. Admin should be able to upload course materials and assignments for each module.
- Students should be able to access the course materials and assignments for their enrolled courses through the LMS. But these materials should be view only and not downloadable. Please prevent screenshots and downloads of the course materials and assignments.
- Please make this application highly mobile responsive, as most of the users will be accessing it from their mobile devices. Use a mobile-first approach for the design and development of the application.

## Technical Details

- Create this Web App using NestJS for backend and React with Vite as frontend
- Use Supabase Postgres as the database to save details. Use enviroment variable. I wil replace it later
- Use Supabase buckets for file storage, like student profile images, course materials, etc.
- Use Redux to do state management, use persistence when it required
- Use popular libraries
- Use ShadCN UI components, make As simple as possible but with an elegant UI
- Make sure to keep this application highly secure, as it will be handling sensitive student data. Use best practices for authentication, authorization, and data protection.
- Make sure to implement proper error handling and logging mechanisms to track any issues that may arise during the usage of the application.
- Keep this application scalable and maintainable and extensible with new features always, as it may need to handle a large number of students and courses in the future. Use best practices for code organization, modularization, and documentation.

## Color Scheme

- For colors and theme, please inspired by the Wintskill Salon Academy website. https://wintskillacademy.lk
- Please use the same color scheme as the website, and make it consistent across the application.
- Use logo of Wintskill Salon Academy in the application when required. It has given in the resources folder. Please use it in the application when required.

## Strategy

1. Write plan with success criteria for each phase to be checked off. Include project scaffolding, including .gitignore, and rigorous unit testing.
2. Execute the plan ensuring all critiera are met
3. Carry out extensive integration testing with Playwright or similar, fixing defects

## Coding standards

1. Use latest versions of libraries and idiomatic approaches as of today
2. Keep it simple - NEVER over-engineer, ALWAYS simplify, NO unnecessary defensive programming. No extra features - focus on simplicity.
3. Be concise. Keep README minimal.
