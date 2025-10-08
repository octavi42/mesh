'use client';

import * as React from 'react';
import { motion, AnimatePresence, type Transition, type HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/utils';

type MotionHighlightMode = 'children' | 'parent';

type Bounds = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type MotionHighlightContextType<T extends string> = {
  mode: MotionHighlightMode;
  activeValue: T | null;
  setActiveValue: (value: T | null) => void;
  setBounds: (bounds: DOMRect) => void;
  clearBounds: () => void;
  id: string;
  hover: boolean;
  className?: string;
  activeClassName?: string;
  setActiveClassName: (className: string) => void;
  transition?: Transition;
  disabled?: boolean;
  enabled?: boolean;
  exitDelay?: number;
  forceUpdateBounds?: boolean;
};

const MotionHighlightContext = React.createContext<
  MotionHighlightContextType<any> | undefined
>(undefined);

function useMotionHighlight<T extends string>(): MotionHighlightContextType<T> {
  const context = React.useContext(MotionHighlightContext);
  if (!context) {
    throw new Error(
      'useMotionHighlight must be used within a MotionHighlightProvider',
    );
  }
  return context as unknown as MotionHighlightContextType<T>;
}

type BaseMotionHighlightProps<T extends string> = {
  mode?: MotionHighlightMode;
  value?: T | null;
  defaultValue?: T | null;
  onValueChange?: (value: T | null) => void;
  className?: string;
  transition?: Transition;
  hover?: boolean;
  disabled?: boolean;
  enabled?: boolean;
  exitDelay?: number;
};

type ParentModeMotionHighlightProps = {
  boundsOffset?: Partial<Bounds>;
  containerClassName?: string;
  forceUpdateBounds?: boolean;
};

type ControlledParentModeMotionHighlightProps<T extends string> =
  BaseMotionHighlightProps<T> &
    ParentModeMotionHighlightProps & {
      mode: 'parent';
      controlledItems: true;
      children: React.ReactNode;
    };

type ControlledChildrenModeMotionHighlightProps<T extends string> =
  BaseMotionHighlightProps<T> & {
    mode?: 'children' | undefined;
    controlledItems: true;
    children: React.ReactNode;
  };

type UncontrolledParentModeMotionHighlightProps<T extends string> =
  BaseMotionHighlightProps<T> &
    ParentModeMotionHighlightProps & {
      mode: 'parent';
      controlledItems?: false;
      itemsClassName?: string;
      children: React.ReactElement | React.ReactElement[];
    };

type UncontrolledChildrenModeMotionHighlightProps<T extends string> =
  BaseMotionHighlightProps<T> & {
    mode?: 'children';
    controlledItems?: false;
    itemsClassName?: string;
    children: React.ReactElement | React.ReactElement[];
  };

type MotionHighlightProps<T extends string> = React.ComponentProps<'div'> &
  (
    | ControlledParentModeMotionHighlightProps<T>
    | ControlledChildrenModeMotionHighlightProps<T>
    | UncontrolledParentModeMotionHighlightProps<T>
    | UncontrolledChildrenModeMotionHighlightProps<T>
  );

const MotionHighlight = React.forwardRef(<T extends string>(
  props: MotionHighlightProps<T>,
  ref: React.Ref<HTMLDivElement>
) => {
  const {
    children,
    value,
    defaultValue,
    onValueChange,
    className,
    transition = { type: 'spring', stiffness: 350, damping: 35 },
    hover = false,
    enabled = true,
    controlledItems,
    disabled = false,
    exitDelay = 0.2,
    mode = 'children',
  } = props;

  const localRef = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => localRef.current as HTMLDivElement);

  const [activeValue, setActiveValueState] = React.useState<T | null>(
    value ?? defaultValue ?? null,
  );
  const [boundsState, setBoundsState] = React.useState<Bounds | null>(null);
  const [activeClassNameState, setActiveClassNameState] =
    React.useState<string>('');

  const safeSetActiveValue = React.useCallback(
    (id: T | null) => {
      setActiveValueState((prev) => (prev === id ? prev : id));
      if (id !== activeValue) onValueChange?.(id as T);
    },
    [activeValue, onValueChange, setActiveValueState],
  );

  const safeSetBounds = React.useCallback(
    (bounds: DOMRect) => {
      if (!localRef.current) return;
      const boundsOffset = (props as ParentModeMotionHighlightProps)
        ?.boundsOffset ?? {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
      };
      const containerRect = localRef.current.getBoundingClientRect();
      const newBounds: Bounds = {
        top: bounds.top - containerRect.top + (boundsOffset.top ?? 0),
        left: bounds.left - containerRect.left + (boundsOffset.left ?? 0),
        width: bounds.width + (boundsOffset.width ?? 0),
        height: bounds.height + (boundsOffset.height ?? 0),
      };
      setBoundsState((prev) => {
        if (
          prev &&
          prev.top === newBounds.top &&
          prev.left === newBounds.left &&
          prev.width === newBounds.width &&
          prev.height === newBounds.height
        ) {
          return prev;
        }
        return newBounds;
      });
    },
    [props],
  );

  const clearBounds = React.useCallback(() => {
    setBoundsState((prev) => (prev === null ? prev : null));
  }, []);

  React.useEffect(() => {
    if (value !== undefined) setActiveValueState(value);
    else if (defaultValue !== undefined) setActiveValueState(defaultValue);
  }, [value, defaultValue, setActiveValueState]);

  const id = React.useId();

  React.useEffect(() => {
    if (mode !== 'parent') return;
    const container = localRef.current;
    if (!container) return;
    const onScroll = () => {
      if (!activeValue) return;
      const activeEl = container.querySelector<HTMLElement>(
        `[data-value="${activeValue}"][data-highlight="true"]`,
      );
      if (activeEl) safeSetBounds(activeEl.getBoundingClientRect());
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [mode, activeValue, safeSetBounds]);

  const render = React.useCallback(
    (childrenToRender: React.ReactNode) => {
      if (mode === 'parent') {
        return (
          <div
            ref={localRef}
            data-slot="motion-highlight-container"
            className={cn(
              'relative',
              (props as ParentModeMotionHighlightProps)?.containerClassName,
            )}
          >
            <AnimatePresence initial={false}>
              {boundsState && (
                <motion.div
                  data-slot="motion-highlight"
                  animate={{
                    top: boundsState.top,
                    left: boundsState.left,
                    width: boundsState.width,
                    height: boundsState.height,
                    opacity: 1,
                  }}
                  initial={{
                    top: boundsState.top,
                    left: boundsState.left,
                    width: boundsState.width,
                    height: boundsState.height,
                    opacity: 0,
                  }}
                  exit={{
                    opacity: 0,
                    transition: {
                      ...transition,
                      delay: (transition?.delay ?? 0) + (exitDelay ?? 0),
                    },
                  }}
                  transition={transition}
                  className={cn(
                    'absolute bg-muted z-0',
                    className,
                    activeClassNameState,
                  )}
                />
              )}
            </AnimatePresence>
            {childrenToRender}
          </div>
        );
      }
      return childrenToRender;
    },
    [
      mode,
      props,
      boundsState,
      transition,
      exitDelay,
      className,
      activeClassNameState,
    ],
  );

  return (
    <MotionHighlightContext.Provider
      value={{
        mode,
        activeValue: activeValue,
        setActiveValue: safeSetActiveValue,
        id,
        hover,
        className,
        transition,
        disabled,
        enabled,
        exitDelay,
        setBounds: safeSetBounds,
        clearBounds,
        activeClassName: activeClassNameState,
        setActiveClassName: setActiveClassNameState,
        forceUpdateBounds: (props as ParentModeMotionHighlightProps)
          ?.forceUpdateBounds,
      }}
    >
      {enabled
        ? controlledItems
          ? render(children)
          : render(
              React.Children.map(children, (child) => {
                if (!React.isValidElement(child)) return child;
                const childDataValue = (child.props as any)['data-value'];
                return (
                  <MotionHighlightItem
                    key={childDataValue || child.key}
                    value={childDataValue}
                    className={(props as UncontrolledChildrenModeMotionHighlightProps<T> | UncontrolledParentModeMotionHighlightProps<T>)?.itemsClassName}
                  >
                    {child}
                  </MotionHighlightItem>
                );
              }),
            )
        : children}
    </MotionHighlightContext.Provider>
  );
}) as <T extends string>(props: MotionHighlightProps<T> & { ref?: React.Ref<HTMLDivElement> }) => React.ReactElement;
(MotionHighlight as any).displayName = 'MotionHighlight';


function getNonOverridingDataAttributes(
  element: React.ReactElement,
  dataAttributes: Record<string, unknown>,
): Record<string, unknown> {
  return Object.keys(dataAttributes).reduce<Record<string, unknown>>(
    (acc, key) => {
      if ((element.props as Record<string, unknown>)[key] === undefined) {
        acc[key] = dataAttributes[key];
      }
      return acc;
    },
    {},
  );
}

type ExtendedChildProps = React.ComponentProps<'div'> & {
  id?: string;
  ref?: React.Ref<HTMLElement>;
  'data-active'?: string;
  'data-value'?: string;
  'data-disabled'?: boolean;
  'data-highlight'?: boolean;
  'data-slot'?: string;
};

type MotionHighlightItemProps = React.ComponentProps<'div'> & {
  children: React.ReactElement;
  id?: string;
  value?: string;
  className?: string;
  transition?: Transition;
  activeClassName?: string;
  disabled?: boolean;
  exitDelay?: number;
  asChild?: boolean;
  forceUpdateBounds?: boolean;
};

const MotionHighlightItem = React.forwardRef<HTMLDivElement, MotionHighlightItemProps>(({
  children,
  id,
  value,
  className,
  transition,
  disabled = false,
  activeClassName,
  exitDelay,
  asChild = false,
  forceUpdateBounds,
  ...props
}, ref) => {
  const itemId = React.useId();
  const {
    activeValue,
    setActiveValue,
    mode,
    setBounds,
    clearBounds,
    hover,
    enabled,
    className: contextClassName,
    transition: contextTransition,
    id: contextId,
    disabled: contextDisabled,
    exitDelay: contextExitDelay,
    forceUpdateBounds: contextForceUpdateBounds,
    setActiveClassName,
  } = useMotionHighlight();

  const element = children as React.ReactElement<ExtendedChildProps>;
  const childValue =
    id ?? value ?? element.props?.['data-value'] ?? element.props?.id ?? itemId;
  const isActive = activeValue === childValue;
  const isDisabled = disabled === undefined ? contextDisabled : disabled;
  const itemTransition = transition ?? contextTransition;

  const localRef = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => localRef.current as HTMLDivElement);

  React.useEffect(() => {
    if (mode !== 'parent') return;
    let rafId: number;
    let previousBounds: Bounds | null = null;
    const shouldUpdateBounds =
      forceUpdateBounds === true ||
      (contextForceUpdateBounds && forceUpdateBounds !== false);

    const updateBounds = () => {
      if (!localRef.current) return;
      const bounds = localRef.current.getBoundingClientRect();
      if (shouldUpdateBounds) {
        if (
          previousBounds &&
          previousBounds.top === bounds.top &&
          previousBounds.left === bounds.left &&
          previousBounds.width === bounds.width &&
          previousBounds.height === bounds.height
        ) {
          rafId = requestAnimationFrame(updateBounds);
          return;
        }
        previousBounds = bounds;
        rafId = requestAnimationFrame(updateBounds);
      }
      setBounds(bounds);
    };

    if (isActive) {
      updateBounds();
      setActiveClassName(activeClassName ?? '');
    } else if (!activeValue) clearBounds();

    if (shouldUpdateBounds) return () => cancelAnimationFrame(rafId);
  }, [
    mode,
    isActive,
    activeValue,
    setBounds,
    clearBounds,
    activeClassName,
    setActiveClassName,
    forceUpdateBounds,
    contextForceUpdateBounds,
  ]);

  if (!React.isValidElement(children)) return children;

  const dataAttributes = {
    'data-active': isActive ? 'true' : 'false',
    'aria-selected': isActive,
    'data-disabled': isDisabled,
    'data-value': childValue,
    'data-highlight': true,
  };

  const commonHandlers = hover
    ? {
        onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
          setActiveValue(childValue);
          element.props.onMouseEnter?.(e);
        },
        onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
          setActiveValue(null);
          element.props.onMouseLeave?.(e);
        },
      }
    : {
        onClick: (e: React.MouseEvent<HTMLDivElement>) => {
          setActiveValue(childValue);
          element.props.onClick?.(e);
        },
      };

  if (asChild) {
    if (mode === 'children') {
      return React.cloneElement(
        element,
        {
          key: childValue,
          ref: localRef,
          className: cn('relative', element.props.className),
          ...getNonOverridingDataAttributes(element, {
            ...dataAttributes,
            'data-slot': 'motion-highlight-item-container',
          }),
          ...commonHandlers,
          ...props,
        } as ExtendedChildProps,
        <>
          <AnimatePresence initial={false}>
            {isActive && !isDisabled && (
              <motion.div
                layoutId={`transition-background-${contextId}`}
                data-slot="motion-highlight"
                className={cn(
                  'absolute inset-0 bg-muted z-0',
                  contextClassName,
                  activeClassName,
                )}
                transition={itemTransition}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{
                  opacity: 0,
                  transition: {
                    ...itemTransition,
                    delay:
                      (itemTransition?.delay ?? 0) +
                      (exitDelay ?? contextExitDelay ?? 0),
                  },
                }}
                {...dataAttributes}
              />
            )}
          </AnimatePresence>
          <div
            data-slot="motion-highlight-item-content-wrapper"
            className={cn('relative z-[1]', className)}
            {...dataAttributes}
          >
            {element.props.children}
          </div>
        </>,
      );
    }
    return React.cloneElement(element, {
      ref: localRef,
      ...getNonOverridingDataAttributes(element, {
        ...dataAttributes,
        'data-slot': 'motion-highlight-item',
      }),
      ...commonHandlers,
    } as ExtendedChildProps);
  }

  return enabled ? (
    <div
      key={childValue}
      ref={localRef}
      data-slot="motion-highlight-item-container"
      className={cn(mode === 'children' && 'relative', className)}
      {...dataAttributes}
      {...props}
      {...commonHandlers}
    >
      {mode === 'children' && (
        <AnimatePresence initial={false}>
          {isActive && !isDisabled && (
            <motion.div
              layoutId={`transition-background-${contextId}`}
              data-slot="motion-highlight"
              className={cn(
                'absolute inset-0 bg-muted z-0',
                contextClassName,
                activeClassName,
              )}
              transition={itemTransition}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{
                opacity: 0,
                transition: {
                  ...itemTransition,
                  delay:
                    (itemTransition?.delay ?? 0) +
                    (exitDelay ?? contextExitDelay ?? 0),
                },
              }}
              {...dataAttributes}
            />
          )}
        </AnimatePresence>
      )}
      {React.cloneElement(element, {
        className: cn('relative z-[1]', element.props.className),
        ...getNonOverridingDataAttributes(element, {
          ...dataAttributes,
          'data-slot': 'motion-highlight-item',
        }),
      } as ExtendedChildProps)}
    </div>
  ) : (
    children
  );
});
(MotionHighlightItem as any).displayName = 'MotionHighlightItem';


type TabsContextType<T extends string> = {
  activeValue: T;
  handleValueChange: (value: T) => void;
  registerTrigger: (value: T, node: HTMLElement | null) => void;
};

const TabsContext = React.createContext<TabsContextType<any> | undefined>(
  undefined,
);

export function useTabs<T extends string = string>(): TabsContextType<T> {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within a TabsProvider');
  }
  return context;
}

type BaseTabsProps = React.ComponentProps<'div'> & {
  children: React.ReactNode;
};

type UnControlledTabsProps<T extends string = string> = BaseTabsProps & {
  defaultValue?: T;
  value?: never;
  onValueChange?: never;
};

type ControlledTabsProps<T extends string = string> = BaseTabsProps & {
  value: T;
  onValueChange?: (value: T) => void;
  defaultValue?: never;
};

export type TabsProps<T extends string = string> =
  | UnControlledTabsProps<T>
  | ControlledTabsProps<T>;

export const Component = <T extends string = string>({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
  ...props
}: TabsProps<T>) => {
  const [activeValue, setActiveValue] = React.useState<T | undefined>(
    defaultValue ?? undefined,
  );
  const triggersRef = React.useRef(new Map<string, HTMLElement>());
  const initialSet = React.useRef(false);
  const isControlled = value !== undefined;

  React.useEffect(() => {
    if (
      !isControlled &&
      activeValue === undefined &&
      triggersRef.current.size > 0 &&
      !initialSet.current
    ) {
      const firstTab = Array.from(triggersRef.current.keys())[0];
      if (firstTab) {
         setActiveValue(firstTab as T);
         initialSet.current = true;
      }
    }
  }, [activeValue, isControlled, triggersRef, initialSet]);

  const registerTrigger = (triggerValue: string, node: HTMLElement | null) => {
    if (node) {
      triggersRef.current.set(triggerValue, node);
      if (!isControlled && activeValue === undefined && !initialSet.current) {
        setActiveValue(triggerValue as T);
        initialSet.current = true;
      }
    } else {
      triggersRef.current.delete(triggerValue);
    }
  };

  const handleValueChange = (val: T) => {
    if (!isControlled) setActiveValue(val);
    else onValueChange?.(val);
  };

  const currentActiveValue = (value ?? activeValue)!;

  return (
    <TabsContext.Provider
      value={{
        activeValue: currentActiveValue,
        handleValueChange,
        registerTrigger,
      }}
    >
      <div
        data-slot="tabs"
        className={cn('flex flex-col gap-2', className)}
        {...props}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export type TabsListProps = React.ComponentProps<'div'> & {
  children: React.ReactNode;
  activeClassName?: string;
  transition?: Transition;
};

export const TabsList = ({
  children,
  className,
  activeClassName,
  transition = {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  },
  ...props
}: TabsListProps) => {
  const { activeValue } = useTabs();

  return (
    <MotionHighlight
      controlledItems
      className={cn('rounded-xl bg-primary shadow-sm', activeClassName)}
      value={activeValue}
      transition={transition}
    >
      <div
        role="tablist"
        data-slot="tabs-list"
        className={cn(
          'bg-card text-muted-foreground inline-flex h-auto w-fit items-center justify-center rounded-xl p-1',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </MotionHighlight>
  );
};

export type TabsTriggerProps = HTMLMotionProps<'button'> & {
  value: string;
  children: React.ReactNode;
};

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(({
  value,
  children,
  className,
  ...props
}, ref) => {
  const { activeValue, handleValueChange, registerTrigger } = useTabs();
  const localRef = React.useRef<HTMLButtonElement | null>(null);

  React.useImperativeHandle(ref, () => localRef.current as HTMLButtonElement);

  React.useEffect(() => {
    if(localRef.current) {
      registerTrigger(value, localRef.current);
    }
    return () => registerTrigger(value, null);
  }, [value, registerTrigger]);

  return (
    <MotionHighlightItem value={value} className="size-full">
      <motion.button
        ref={localRef}
        data-slot="tabs-trigger"
        role="tab"
        whileTap={{ scale: 0.97 }}
        onClick={() => handleValueChange(value)}
        data-state={activeValue === value ? 'active' : 'inactive'}
        className={cn(
          'inline-flex cursor-pointer items-center size-full justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-primary-foreground data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground z-[1]',
          className,
        )}
        {...props}
      >
        {children}
      </motion.button>
    </MotionHighlightItem>
  );
});
TabsTrigger.displayName = 'TabsTrigger';


export type TabsContentsProps = React.ComponentProps<'div'> & {
  children: React.ReactNode;
  transition?: Transition;
};

export const TabsContents = ({
  children,
  className,
  transition = {
    type: 'spring',
    stiffness: 300,
    damping: 30,
    bounce: 0,
    restDelta: 0.01,
  },
  ...props
}: TabsContentsProps) => {
  const { activeValue } = useTabs();
  const childrenArray = React.Children.toArray(children);
  const activeIndex = childrenArray.findIndex(
    (child): child is React.ReactElement<{ value: string }> =>
      React.isValidElement(child) &&
      typeof child.props === 'object' &&
      child.props !== null &&
      'value' in child.props &&
      (child.props as { value: string }).value === activeValue,
  );

  return (
    <div
      data-slot="tabs-contents"
      className={cn('overflow-hidden', className)}
      {...props}
    >
      <motion.div
        className="flex -mx-2"
        animate={{ x: activeIndex * -100 + '%' }}
        transition={transition}
      >
        {childrenArray.map((child, index) => (
          <div key={index} className="w-full shrink-0 px-2">
            {child}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export type TabsContentProps = HTMLMotionProps<'div'> & {
  value: string;
  children: React.ReactNode;
};

export const TabsContent = ({
  children,
  value,
  className,
  ...props
}: TabsContentProps) => {
  const { activeValue } = useTabs();
  const isActive = activeValue === value;
  return (
    <motion.div
      role="tabpanel"
      data-slot="tabs-content"
      className={cn('overflow-hidden', className)}
      initial={{ filter: 'blur(0px)' }}
      animate={{ filter: isActive ? 'blur(0px)' : 'blur(4px)' }}
      exit={{ filter: 'blur(0px)' }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export type { TabsContextType };
