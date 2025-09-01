--- ## FRONTEND
# 1) Create the folders
cd C:\projects
mkdir inclew-app
cd .\inclew-app\
mkdir server

# 2) Frontend: Vite + React + TS + Tailwind v4
npm create vite@latest client
# Choose: React  →  TypeScript + SWC
cd .\client\
npm install
npm install tailwindcss @tailwindcss/vite

###
# Edit client/vite.config.ts:
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'      // if your template uses @vitejs/plugin-react, import that instead
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
###

###
# this will require moving index.css that exists to a styles directory
# Create client/src/styles/index.css:
@import "tailwindcss";
###

###
# Import it in client/src/main.tsx:
import './styles/index.css'
###

# Run it:
npm run dev


### BACKEND
# Creating the Node Server (optional scaffold)
cd ..\server
npm init -y
npm install express
# TypeScript backend (optional)
npm install -D typescript ts-node @types/node @types/express
npx tsc --init

###
# Create server/src/index.ts:
import express from 'express'
const app = express()
const PORT = 3001

app.get('/', (_req, res) => res.send('Hello from server!'))
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`))
###

###
#Then edit tsconfig.json to include:
{
  "compilerOptions": {
    "target": "ES6",
    "module": "CommonJS",
    "rootDir": "src",
    "outDir": "dist",
    "esModuleInterop": true,
    "strict": true
  }
}
#

# Run it
npx ts-node src/index.ts
# or
npm run dev

# Running both together, split the terminal Ctrl + Shift + 5

# In client/: run
npm run dev
# In server/: run
npm run dev
# split the terminal to do this