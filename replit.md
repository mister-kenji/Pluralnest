# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Primary artifact is **PluralNest**, a privacy-first Expo mobile app for DID/OSDD plural systems.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9

## Artifacts

### PluralNest (artifacts/pluralnest)
- **Framework**: Expo (React Native) with expo-router file-based routing
- **Storage**: AsyncStorage only — fully local, no backend, no account required
- **Theme**: Dark grayscale (#111118 bg) with dynamic accent color (default: lavender #a89de8)
- **State**: `StorageContext.tsx` manages all data + AsyncStorage persistence

#### Key Features Built
- Dashboard with active fronters, quick actions, recent switches
- Members list with groups, search, archive
- Member profiles with edit (pronouns, role, color, profile image/GIF, custom fields, relationships, tags)
- Fronting log with multi-front support (main/co-front/co-conscious), switch notes, switch modal
- Inner chat (per-member messages, replies, pinning, image attachments, reactions, custom emojis)
- Journals (per-member, markdown content, cover images, tags, journal locks with PIN)
- Headspace map (nested tree of places/images/descriptions, member links)
- Forums & polls (replies, voting)
- Settings (accent color picker, screen lock, panic close, easy mode, feature toggles)
- Export/import JSON backup
- Recently Deleted (30-day soft delete, restore)
- Search (members, journals, forums)
- More tab with navigation to all features

#### File Structure
- `app/_layout.tsx` — root layout with StorageProvider + LockProvider wrapping all screens
- `app/(tabs)/` — 5 main tabs: Dashboard, Members, Chat, Journals, More
- `app/member/[id].tsx`, `app/member/edit.tsx` — member detail and edit
- `app/fronting/index.tsx` — fronting log
- `app/journal/[id].tsx`, `app/journal/create.tsx` — journal entry CRUD
- `app/headspace/index.tsx` — headspace nested tree
- `app/forums/` — forum list, detail, create
- `app/settings/` — settings and export screens
- `app/deleted/index.tsx` — recently deleted
- `app/search.tsx` — global search
- `context/StorageContext.tsx` — all data types + AsyncStorage
- `context/LockContext.tsx` — app lock + journal locks
- `hooks/useColors.ts` — dynamic theme colors using accent from settings
- `constants/colors.ts` — base dark theme palette
- `utils/helpers.ts` — genId, formatDate, MEMBER_COLORS, etc.
- `components/` — MemberAvatar, FrontingBadge, TagChip, MarkdownText, EmptyState, PinModal

## Key Commands

- `pnpm --filter @workspace/pluralnest run dev` — run Expo dev server
