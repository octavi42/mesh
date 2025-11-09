'use client';

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useState, KeyboardEvent } from "react";
import { UserInfoSheet } from "@/components/sheets/user-info-sheet";
import { AllUsersSheet } from "@/components/sheets/all-users-sheet";
import { Users, UserPlus } from "lucide-react";
import { InviteUserSheet } from "@/components/sheets/invite-user-sheet";

interface User {
  id: string | number;
  name?: string;
  image: string;
  pubkey?: string;
  role?: string;
}

interface UserAvatarsProps {
  users: User[];
  size?: number | string;
  className?: string;
  maxVisible?: number;
  overlap?: number;
  focusScale?: number;
  isAdmin?: boolean;
  showUsersButton?: boolean;
  showInviteButton?: boolean;
}

export const UserAvatars = ({
  users,
  size = 40,
  className,
  maxVisible = 5,
  overlap = 60,
  focusScale = 1.2,
  isAdmin = false,
  showUsersButton = true,
  showInviteButton = false,
}: UserAvatarsProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const safeSize = typeof size === 'number' && !isNaN(size) && size > 0 ? size : 40;
  const safeMaxVisible = typeof maxVisible === 'number' && !isNaN(maxVisible) && maxVisible > 0 ? maxVisible : 5;
  const safeOverlap = typeof overlap === 'number' && !isNaN(overlap) ? Math.max(0, Math.min(100, overlap)) : 60;
  const safeFocusScale = typeof focusScale === 'number' && !isNaN(focusScale) && focusScale > 0 ? focusScale : 1.2;

  const shouldShowPlusBubble = users.length > safeMaxVisible;
  const displayLimit = shouldShowPlusBubble ? safeMaxVisible : users.length;
  const slicedUsers = users.slice(0, displayLimit);
  const hiddenCount = users.length - slicedUsers.length;

  let allUsersToRender = shouldShowPlusBubble
    ? [...slicedUsers, { id: 'plus-bubble', name: undefined, image: '' }]
    : slicedUsers;

  // If there are no users and showInviteButton is true, show invite button
  if (users.length === 0 && showInviteButton) {
    allUsersToRender = [{ id: 'invite-bubble', name: undefined, image: '' }];
  }

  // Add users button if enabled (but not if we're showing invite button)
  if (showUsersButton && !(users.length === 0 && showInviteButton)) {
    allUsersToRender = [...allUsersToRender, { id: 'users-bubble', name: undefined, image: '' }];
  }

  const handleKeyEnter = (e: KeyboardEvent<HTMLButtonElement>, user: User) => {
    if ((e.key === "Enter" || e.key === " ") && user.id !== 'plus-bubble' && user.id !== 'users-bubble' && user.id !== 'invite-bubble') {
      const triggerElement = (e.target as HTMLElement).nextElementSibling as HTMLElement;
      triggerElement?.click();
    }
  };

  return (
    <div className={cn("flex items-center", className)}>
      {allUsersToRender.map((user, index) => {
        const isHoveredOne = hoveredIndex === index;
        const isLengthBubble = user.id === 'plus-bubble';
        const isUsersBubble = user.id === 'users-bubble';
        const isInviteBubble = user.id === 'invite-bubble';

        const diff = 1 - safeOverlap / 100;
        const zIndex = isHoveredOne ? allUsersToRender.length : index;

        const shouldScale = isHoveredOne;
        const shouldShift = hoveredIndex !== null && index > hoveredIndex;

        const baseGap = safeSize * (safeOverlap / 100);
        const neededGap = (safeSize * (1 + safeFocusScale)) / 2;
        const shift = Math.max(0, neededGap - baseGap);

        if (isUsersBubble) {
          return (
            <AllUsersSheet
              key={user.id}
              users={users}
              isAdmin={isAdmin}
              trigger={
                <motion.div
                  role="img"
                  aria-label="Show all users"
                  className="relative cursor-pointer outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-full bg-white dark:bg-gray-900"
                  style={{
                    width: safeSize,
                    height: safeSize,
                    zIndex,
                    marginLeft: index === 0 ? 0 : -safeSize * diff,
                    padding: '3px',
                  }}
                  tabIndex={0}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onFocus={() => setHoveredIndex(index)}
                  onBlur={() => setHoveredIndex(null)}
                  animate={{
                    scale: shouldScale ? safeFocusScale : 1,
                    x: shouldShift ? shift : 0,
                  }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden shadow-lg">
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              }
            />
          );
        }

        if (isInviteBubble) {
          return (
            <InviteUserSheet
              key={user.id}
              trigger={
                <motion.div
                  role="img"
                  aria-label="Invite member"
                  className="relative cursor-pointer outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-full bg-white dark:bg-gray-900"
                  style={{
                    width: safeSize,
                    height: safeSize,
                    zIndex,
                    marginLeft: index === 0 ? 0 : -safeSize * diff,
                    padding: '3px',
                  }}
                  tabIndex={0}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onFocus={() => setHoveredIndex(index)}
                  onBlur={() => setHoveredIndex(null)}
                  animate={{
                    scale: shouldScale ? safeFocusScale : 1,
                    x: shouldShift ? shift : 0,
                  }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden shadow-lg">
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                      <UserPlus className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              }
            />
          );
        }

        if (isLengthBubble) {
          return (
            <AllUsersSheet
              key={user.id}
              users={users}
              isAdmin={isAdmin}
              trigger={
                <motion.div
                  role="img"
                  aria-label="Show more users"
                  className="relative cursor-pointer outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-full bg-white dark:bg-gray-900"
                  style={{
                    width: safeSize,
                    height: safeSize,
                    zIndex,
                    marginLeft: index === 0 ? 0 : -safeSize * diff,
                    padding: '3px',
                  }}
                  tabIndex={0}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onFocus={() => setHoveredIndex(index)}
                  onBlur={() => setHoveredIndex(null)}
                  animate={{
                    scale: shouldScale ? safeFocusScale : 1,
                    x: shouldShift ? shift : 0,
                  }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden shadow-lg">
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-semibold text-white">
                      +{hiddenCount}
                    </div>
                  </div>
                </motion.div>
              }
            />
          );
        }

        return (
          <UserInfoSheet
            key={user.id}
            user={user}
            isAdmin={isAdmin}
            trigger={
              <motion.button
                role="img"
                aria-label={user.name || "User avatar"}
                className="relative cursor-pointer outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-full bg-white dark:bg-gray-900 text-left"
                style={{
                  width: safeSize,
                  height: safeSize,
                  zIndex,
                  marginLeft: index === 0 ? 0 : -safeSize * diff,
                  padding: '3px',
                }}
                tabIndex={0}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(index)}
                onBlur={() => setHoveredIndex(null)}
                onKeyDown={(e) => handleKeyEnter(e, user)}
                animate={{
                  scale: shouldScale ? safeFocusScale : 1,
                  x: shouldShift ? shift : 0,
                }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <div className="w-full h-full rounded-full overflow-hidden shadow-lg">
                  <img
                    src={user.image}
                    alt={user.name || "User"}
                    className="w-full h-full object-cover bg-gray-100 dark:bg-gray-800"
                  />
                </div>

                <AnimatePresence>
                  {shouldScale && user.name && (
                    <motion.div
                      role="tooltip"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      className="absolute bottom-full mb-2 left-1/2 z-10"
                    >
                      <div className="transform -translate-x-1/2 whitespace-nowrap rounded-md bg-black text-white text-xs px-2 py-1 shadow-lg">
                        {user.name}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            }
          />
        );
      })}
    </div>
  );
};
