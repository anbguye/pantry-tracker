# Pantry Tracker

A web application that helps you manage your pantry inventory and suggests recipes based on available ingredients. Built with Next.js, Firebase, and Groq AI.

## Features

- ✅ Inventory Management
  - Add, edit, and delete pantry items
  - Track quantities and units
  - Upload item images using mobile/browser camera
  - Search functionality to easily find items

- ✅ Recipe Suggestions
  - AI-powered recipe recommendations based on your pantry contents
  - Uses Groq AI for intelligent recipe generation

- ✅ Modern Tech Stack
  - Next.js 14 with App Router
  - Firebase Backend (Firestore & Storage)
  - Shadcn UI Components
  - TypeScript
  - Tailwind CSS

## Live Demo

Visit the website here: [Pantry Tracker](https://pantry-tracker-blue-nine.vercel.app/)

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pantry-tracker.git
cd pantry-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Firebase and Groq API credentials:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_OPENAI_API_KEY=your_groq_api_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `app/` - Next.js app router pages and components
- `components/` - Reusable UI components using shadcn/ui
- `app/firebase.tsx` - Firebase configuration and initialization
- `public/` - Static assets

## Deployment

The project is configured for easy deployment on Vercel with CI/CD integration. Simply connect your GitHub repository to Vercel and it will automatically deploy on every push to the main branch.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.