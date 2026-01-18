# Getting Started Tutorial: React, TypeScript & Tailwind CSS

A beginner-friendly guide to understanding the Video Production Manager codebase.

## Table of Contents
1. [Project Overview](#project-overview)
2. [React Fundamentals](#react-fundamentals)
3. [TypeScript Basics](#typescript-basics)
4. [Tailwind CSS Styling](#tailwind-css-styling)
5. [File Structure](#file-structure)
6. [How Data Flows](#how-data-flows)
7. [Making Your First Change](#making-your-first-change)
8. [Common Patterns](#common-patterns)

---

## Project Overview

Your app is a **Single Page Application (SPA)** built with modern web technologies:

```
Browser loads index.html 
    ↓
Loads main.tsx (entry point)
    ↓
Renders App.tsx (main component)
    ↓
Shows different pages based on navigation
```

### Key Technologies

- **React**: A library for building user interfaces with reusable components
- **TypeScript**: JavaScript with type safety to catch errors before runtime
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Vite**: Fast development server and build tool
- **Zustand**: Simple state management for sharing data between components

---

## React Fundamentals

### What is React?

React lets you build UIs using **components** - reusable pieces of UI that manage their own state and appearance.

### Components

Think of components as LEGO blocks. Each component is a self-contained piece of UI.

**Example from your project** - [src/components/ui/index.tsx](../src/components/ui/index.tsx):

```tsx
// A simple Card component
export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`card ${className}`}>
      {children}
    </div>
  );
}
```

**Breaking it down:**
- `export function Card` - Creates a reusable component called Card
- `({ children, className })` - Props (inputs) the component accepts
- `return (...)` - JSX (HTML-like syntax) that gets rendered
- `{children}` - Content passed between `<Card>...</Card>` tags

### Using Components

```tsx
// In any page, you can use the Card component:
<Card className="p-4">
  <h2>My Title</h2>
  <p>Some content</p>
</Card>
```

### JSX (JavaScript XML)

JSX lets you write HTML-like code in JavaScript:

```tsx
// JSX (looks like HTML)
<div className="container">
  <h1>Hello {name}</h1>
  <button onClick={handleClick}>Click me</button>
</div>
```

**Key differences from HTML:**
- `className` instead of `class` (because `class` is a JavaScript keyword)
- `onClick` instead of `onclick` (camelCase for events)
- `{expression}` to embed JavaScript values

### React Hooks

Hooks let you use state and other React features. Your app uses several:

#### 1. `useState` - Component State

```tsx
const [count, setCount] = useState(0);
//     ↑       ↑          ↑
//   value  setter    initial value

// Use it:
<button onClick={() => setCount(count + 1)}>
  Count: {count}
</button>
```

#### 2. `useEffect` - Side Effects

```tsx
useEffect(() => {
  // This runs when component mounts or dependencies change
  console.log('Component loaded');
}, []); // Empty array = run once on mount
```

#### 3. Custom Hooks (your app uses `useProductionStore`)

```tsx
// From src/hooks/useStore.ts
const sources = useProductionStore(state => state.sources);
const addSource = useProductionStore(state => state.addSource);
```

This is Zustand's way of accessing global state (data shared across all components).

---

## TypeScript Basics

### What is TypeScript?

TypeScript = JavaScript + Types. It catches errors before you run your code.

### Types vs Interfaces

**Type Alias** - for simple types:
```typescript
type SourceType = 'LAPTOP' | 'CAM' | 'SERVER';
type ConnectorType = 'HDMI' | 'SDI' | 'DP';
```

**Interface** - for object shapes:
```typescript
interface Source {
  id: string;
  type: SourceType;
  name: string;
  rate: number;
  output: ConnectorType;
}
```

### Using Types in React

```tsx
// Props with TypeScript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;  // ? means optional
}

function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
```

### Type Safety Example

```typescript
// ✅ TypeScript catches this error at compile time:
const source: Source = {
  id: 'SRC 1',
  type: 'INVALID',  // ❌ Error! Not a valid SourceType
  name: 'Camera',
  rate: 60,
  output: 'HDMI'
};

// ✅ This is correct:
const source: Source = {
  id: 'SRC 1',
  type: 'CAM',  // ✓ Valid SourceType
  name: 'Camera',
  rate: 60,
  output: 'HDMI'
};
```

### Your Type Definitions

All types are in [src/types/index.ts](../src/types/index.ts):

```typescript
export interface Source {
  id: string;
  type: SourceType;
  name: string;
  hRes?: number;        // ? means optional
  vRes?: number;
  rate: number;
  output: ConnectorType;
  note?: string;
}
```

---

## Tailwind CSS Styling

### What is Tailwind?

Instead of writing CSS files, you use utility classes directly in your HTML/JSX.

### Traditional CSS vs Tailwind

**Traditional CSS:**
```css
/* styles.css */
.my-button {
  background-color: blue;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
}
```
```html
<button class="my-button">Click</button>
```

**Tailwind CSS:**
```tsx
<button className="bg-blue-500 text-white px-4 py-2 rounded">
  Click
</button>
```

### Common Tailwind Classes

#### Spacing
```tsx
<div className="p-4">      {/* padding: 1rem (all sides) */}
<div className="px-4 py-2"> {/* px = horizontal, py = vertical */}
<div className="m-4">      {/* margin: 1rem */}
<div className="mt-2">     {/* margin-top: 0.5rem */}
```

#### Colors
```tsx
<div className="bg-blue-500">    {/* background color */}
<div className="text-white">     {/* text color */}
<div className="border-gray-300"> {/* border color */}
```

#### Layout
```tsx
<div className="flex">           {/* display: flex */}
<div className="flex items-center"> {/* align items center */}
<div className="flex justify-between"> {/* space-between */}
<div className="grid grid-cols-3">  {/* 3 column grid */}
```

#### Sizing
```tsx
<div className="w-full">    {/* width: 100% */}
<div className="h-screen">  {/* height: 100vh */}
<div className="w-64">      {/* width: 16rem */}
```

#### Responsive Design
```tsx
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* Mobile: full width, tablet: 50%, desktop: 33% */}
</div>
```

### Custom Theme (your app)

Your app has custom colors defined in [tailwind.config.js](../tailwind.config.js):

```javascript
colors: {
  'av-bg': '#0a0e14',           // Dark background
  'av-surface': '#131920',      // Surface/card color
  'av-text': '#e6edf3',         // Text color
  'av-accent': '#00ff88',       // Bright green accent
  'signal-sdi': '#00ff88',      // SDI connector color
  'signal-hdmi': '#4dabf7',     // HDMI connector color
}
```

**Usage:**
```tsx
<div className="bg-av-surface text-av-text border border-av-border">
  Content with custom theme colors
</div>
```

### Custom CSS Classes (your app)

Some common patterns are defined in [src/styles/globals.css](../src/styles/globals.css):

```css
.card {
  @apply bg-av-surface border border-av-border rounded-lg shadow-inner-glow;
}

.btn-primary {
  @apply btn bg-av-accent text-av-bg hover:bg-av-accent-dim;
}
```

**Usage:**
```tsx
<div className="card p-4">
  <button className="btn-primary">Save</button>
</div>
```

---

## File Structure

### Entry Point Flow

```
1. index.html                 (HTML shell)
     ↓
2. src/main.tsx              (JavaScript entry)
     ↓
3. src/App.tsx               (Main app component)
     ↓
4. src/components/Layout.tsx (Layout with sidebar)
     ↓
5. src/pages/*.tsx           (Individual pages)
```

### Directory Breakdown

```
src/
├── components/          # Reusable UI pieces
│   ├── ui/             # Basic components (Button, Card, Badge)
│   │   └── index.tsx   # All UI components in one file
│   └── Layout.tsx      # Main layout with navigation
│
├── pages/              # Full page components
│   ├── Dashboard.tsx   # Home page
│   ├── Sources.tsx     # Sources management page
│   ├── Sends.tsx       # Sends management page
│   └── ...
│
├── models/             # ✨ NEW: Class-based models
│   ├── Source.ts       # Source class with methods
│   ├── Send.ts         # Send class with methods
│   └── index.ts        # Export all models
│
├── services/           # ✨ NEW: Business logic
│   ├── SourceService.ts # Source operations
│   ├── SendService.ts   # Send operations
│   └── index.ts         # Export all services
│
├── hooks/              # Custom React hooks
│   └── useStore.ts     # Zustand state management
│
├── types/              # TypeScript definitions
│   └── index.ts        # All interfaces and types
│
├── data/               # Sample/seed data
│   └── sampleData.ts   # Pre-loaded data
│
├── styles/             # CSS files
│   └── globals.css     # Tailwind + custom styles
│
└── utils/              # Helper functions
    └── helpers.ts      # Utility functions
```

### Understanding a Component File

Let's look at [src/pages/Sources.tsx](../src/pages/Sources.tsx):

```tsx
// 1. IMPORTS
import { useState } from 'react';           // React hooks
import { useProductionStore } from '@/hooks/useStore'; // Our state
import type { Source } from '@/types';      // TypeScript types
import { Card, Badge } from '@/components/ui'; // UI components

// 2. COMPONENT DEFINITION
export default function Sources() {
  // 3. STATE & DATA
  const sources = useProductionStore(state => state.sources);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 4. COMPUTED VALUES
  const filteredSources = sources.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // 5. EVENT HANDLERS
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // 6. RENDER JSX
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Sources</h1>
      
      <input 
        type="text"
        value={searchQuery}
        onChange={handleSearch}
        placeholder="Search sources..."
        className="input-field mb-4"
      />
      
      <div className="grid gap-4">
        {filteredSources.map(source => (
          <Card key={source.id}>
            <h3>{source.name}</h3>
            <Badge>{source.type}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## How Data Flows

### The Zustand Store (Global State)

Your app uses Zustand for state management. Think of it as a global object that any component can access.

**Location:** [src/hooks/useStore.ts](../src/hooks/useStore.ts)

```typescript
// The store contains all your app data
interface ProductionStore {
  // Data
  sources: Source[];
  sends: Send[];
  production: Production | null;
  
  // Actions (functions to modify data)
  addSource: (source: Source) => void;
  updateSource: (id: string, updates: Partial<Source>) => void;
  deleteSource: (id: string) => void;
}
```

### Accessing Data in Components

```tsx
// Read data
const sources = useProductionStore(state => state.sources);

// Get specific items
const cameras = useProductionStore(state => 
  state.sources.filter(s => s.type === 'CAM')
);

// Get functions
const addSource = useProductionStore(state => state.addSource);
const deleteSource = useProductionStore(state => state.deleteSource);
```

### Modifying Data

```tsx
function AddSourceButton() {
  const addSource = useProductionStore(state => state.addSource);
  const sources = useProductionStore(state => state.sources);
  
  const handleClick = () => {
    const newSource = {
      id: `SRC ${sources.length + 1}`,
      type: 'LAPTOP',
      name: 'New Laptop',
      rate: 59.94,
      output: 'HDMI'
    };
    
    addSource(newSource);  // Updates global state
  };
  
  return <button onClick={handleClick}>Add Source</button>;
}
```

### Data Flow Diagram

```
┌─────────────────────────────────────────┐
│         Zustand Store (Global)          │
│  sources: [...], sends: [...], etc.     │
└─────────────────────────────────────────┘
           ↓ read           ↑ update
           ↓                ↑
    ┌──────────────┐  ┌──────────────┐
    │ Component A  │  │ Component B  │
    │ (Sources.tsx)│  │ (Sends.tsx)  │
    └──────────────┘  └──────────────┘

When Component B updates the store,
Component A automatically re-renders!
```

### Persistence

The store automatically saves to localStorage:

```typescript
// From useStore.ts
export const useProductionStore = create<ProductionStore>()(
  persist(
    (set) => ({ /* store definition */ }),
    { name: 'video-production-storage' } // localStorage key
  )
);
```

This means data persists between page refreshes! 🎉

---

## Making Your First Change

Let's add a "Total Sources" count to the Dashboard.

### Step 1: Open Dashboard.tsx

File: [src/pages/Dashboard.tsx](../src/pages/Dashboard.tsx)

### Step 2: Get the Data

Add this near the top of the component:

```tsx
const sources = useProductionStore(state => state.sources);
const totalSources = sources.length;
```

### Step 3: Display It

Add this to the JSX:

```tsx
<Card className="p-6">
  <h3 className="text-lg font-semibold mb-2">Total Sources</h3>
  <p className="text-4xl font-bold text-av-accent">{totalSources}</p>
</Card>
```

### Step 4: Save and See It Update

Vite's hot module reload will automatically refresh the page! 🔥

### Complete Example

```tsx
export default function Dashboard() {
  const sources = useProductionStore(state => state.sources);
  const sends = useProductionStore(state => state.sends);
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Total Sources</h3>
          <p className="text-4xl font-bold text-av-accent">
            {sources.length}
          </p>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Total Sends</h3>
          <p className="text-4xl font-bold text-av-info">
            {sends.length}
          </p>
        </Card>
      </div>
    </div>
  );
}
```

---

## Common Patterns

### Pattern 1: Mapping Over Arrays

Display a list of items:

```tsx
{sources.map(source => (
  <Card key={source.id}>
    <h3>{source.name}</h3>
  </Card>
))}
```

**Key points:**
- Always provide a `key` prop (React needs it for performance)
- Use a unique identifier (like `id`) for the key
- The callback returns JSX for each item

### Pattern 2: Conditional Rendering

Show/hide based on conditions:

```tsx
{sources.length > 0 ? (
  <div>You have {sources.length} sources</div>
) : (
  <div>No sources found</div>
)}

// OR using &&
{sources.length > 0 && (
  <div>You have {sources.length} sources</div>
)}
```

### Pattern 3: Event Handlers

Handle user interactions:

```tsx
const handleClick = () => {
  console.log('Button clicked');
};

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  console.log('Input changed:', value);
};

return (
  <>
    <button onClick={handleClick}>Click Me</button>
    <input onChange={handleChange} />
  </>
);
```

### Pattern 4: Form Handling

```tsx
function AddSourceForm() {
  const [name, setName] = useState('');
  const [type, setType] = useState<SourceType>('LAPTOP');
  const addSource = useProductionStore(state => state.addSource);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent page reload
    
    addSource({
      id: `SRC ${Date.now()}`,
      name,
      type,
      rate: 59.94,
      output: 'HDMI'
    });
    
    // Reset form
    setName('');
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Source name"
        className="input-field"
      />
      
      <select 
        value={type} 
        onChange={e => setType(e.target.value as SourceType)}
        className="input-field"
      >
        <option value="LAPTOP">Laptop</option>
        <option value="CAM">Camera</option>
        <option value="SERVER">Server</option>
      </select>
      
      <button type="submit" className="btn-primary">
        Add Source
      </button>
    </form>
  );
}
```

### Pattern 5: Using Services

With the new model/service architecture:

```tsx
import { SourceService } from '@/services';
import { Source } from '@/models';

function SourceManager() {
  const sources = useProductionStore(state => state.sources);
  const addSource = useProductionStore(state => state.addSource);
  
  const handleAddCamera = () => {
    // Use service to create with auto-generated ID
    const newCamera = SourceService.createNew(sources, 'CAM', 'Camera 5');
    
    // Customize properties
    const configured = newCamera.update({
      hRes: 1920,
      vRes: 1080,
      note: 'Audience wide shot'
    });
    
    // Add to store
    addSource(configured.toJSON());
  };
  
  const handleExport = () => {
    const json = SourceService.exportToJSON(sources);
    console.log(json); // Or download as file
  };
  
  return (
    <div>
      <button onClick={handleAddCamera}>Add Camera</button>
      <button onClick={handleExport}>Export Sources</button>
    </div>
  );
}
```

---

## Quick Reference

### React Imports You'll Use Often

```tsx
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
```

### Zustand Store Access

```tsx
import { useProductionStore } from '@/hooks/useStore';

const data = useProductionStore(state => state.someData);
const action = useProductionStore(state => state.someAction);
```

### Common TypeScript Patterns

```tsx
// Props interface
interface MyComponentProps {
  title: string;
  count?: number;           // Optional
  onClick: () => void;      // Function with no args
  onSubmit: (data: FormData) => void; // Function with args
  children: ReactNode;      // Any valid React children
}

// Component with props
function MyComponent({ title, count = 0 }: MyComponentProps) {
  return <div>{title}: {count}</div>;
}
```

### Tailwind Cheat Sheet

```tsx
{/* Layout */}
<div className="flex flex-col gap-4">
<div className="grid grid-cols-3 gap-4">

{/* Spacing */}
<div className="p-4 m-2">      {/* padding & margin */}
<div className="px-6 py-3">    {/* horizontal & vertical */}

{/* Colors (your theme) */}
<div className="bg-av-surface text-av-text">
<div className="border border-av-border">

{/* Typography */}
<h1 className="text-3xl font-bold">
<p className="text-sm text-av-text-muted">

{/* Common combinations */}
<button className="btn-primary px-4 py-2">
<input className="input-field w-full">
<div className="card p-6">
```

---

## Next Steps

1. **Explore the codebase**
   - Open [src/pages/Sources.tsx](../src/pages/Sources.tsx) and read through it
   - Look at [src/components/Layout.tsx](../src/components/Layout.tsx) to see navigation
   - Check [src/hooks/useStore.ts](../src/hooks/useStore.ts) to understand state

2. **Make small changes**
   - Add a new stat card to the Dashboard
   - Change colors in [tailwind.config.js](../tailwind.config.js)
   - Add a new badge color

3. **Build a simple feature**
   - Add a "Clear All" button to delete all sources
   - Add a filter dropdown to show only cameras
   - Create a count badge showing total items

4. **Read the docs**
   - [React Official Docs](https://react.dev)
   - [TypeScript Handbook](https://www.typescriptlang.org/docs/)
   - [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

## Debugging Tips

### Check the Browser Console

Press `F12` or `Cmd+Option+I` to open developer tools:
- **Console tab**: See errors and `console.log()` output
- **Elements tab**: Inspect HTML and CSS
- **React DevTools**: Install extension to inspect component state

### Common Errors

**"Cannot read property of undefined"**
```tsx
// ❌ Unsafe - might be undefined
<div>{source.name}</div>

// ✅ Safe - check first
<div>{source?.name || 'No name'}</div>
```

**"Hook called conditionally"**
```tsx
// ❌ Wrong - hooks must be at top level
if (condition) {
  const data = useState(null);
}

// ✅ Correct
const data = useState(null);
if (condition) {
  // use data
}
```

**Type errors**
```tsx
// ❌ TypeScript error
const source: Source = { id: 1 }; // id should be string

// ✅ Fixed
const source: Source = { id: '1', type: 'CAM', ... };
```

---

## Glossary

- **Component**: A reusable piece of UI (like a function that returns HTML)
- **Props**: Inputs passed to a component
- **State**: Data that can change over time
- **Hook**: Special function that lets you use React features (starts with `use`)
- **JSX**: HTML-like syntax in JavaScript
- **Type**: TypeScript definition of what data looks like
- **Store**: Global state accessible from anywhere
- **Utility class**: Tailwind CSS class that applies one CSS property

---

Need help? The codebase is well-organized and TypeScript will catch most errors before you even run the code. Start small, experiment, and don't be afraid to break things - that's how you learn! 🚀
