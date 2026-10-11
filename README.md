# Graph.Cafe

A cozy web app for sketching small graphs—nodes, edges, and café-themed starter templates—in your browser.

## Features (MVP)

- Interactive canvas powered by [React Flow](https://reactflow.dev/)
- **Today's menu**: blank slate plus sample graphs (morning routine, espresso pipeline, friend circle, study group)
- Add nodes, drag to reposition, connect handles to draw edges
- Double-click a node to rename it
- Responsive layout with a mobile sheet for the template menu

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS v4
- shadcn/ui components
- `@xyflow/react` for graph editing

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43127](http://localhost:43127).

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Dev server on port 43127 |
| `npm run build`| Production build         |
| `npm run start`| Start production server  |
| `npm run lint` | ESLint                   |
