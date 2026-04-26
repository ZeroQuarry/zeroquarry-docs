import React, {cloneElement, useEffect, useRef, useState} from "react";
import {
  sanitizeTabsChildren,
  TabsProvider,
  useScrollPositionBlocker,
  useTabsContextValue,
} from "@docusaurus/theme-common/internal";
import useIsBrowser from "@docusaurus/useIsBrowser";
import clsx from "clsx";
import flatten from "lodash/flatten";

function TabList({
  className,
  block,
  selectedValue,
  selectValue,
  tabValues,
  onChange,
}) {
  const tabRefs = [];
  const {blockElementScrollPositionUntilNextRender} =
    useScrollPositionBlocker();
  const tabItemListContainerRef = useRef(null);
  const [showTabArrows, setShowTabArrows] = useState(false);

  const handleTabChange = (event) => {
    const newTab = event.currentTarget;
    const newTabIndex = tabRefs.indexOf(newTab);
    const newTabValue = tabValues[newTabIndex].value;

    if (newTabValue !== selectedValue) {
      blockElementScrollPositionUntilNextRender(newTab);
      selectValue(newTabValue);
      onChange?.(newTabIndex);
    }
  };

  const handleKeydown = (event) => {
    let focusElement = null;

    switch (event.key) {
      case "Enter":
        handleTabChange(event);
        break;
      case "ArrowRight": {
        const nextTab = tabRefs.indexOf(event.currentTarget) + 1;
        focusElement = tabRefs[nextTab] ?? tabRefs[0];
        break;
      }
      case "ArrowLeft": {
        const prevTab = tabRefs.indexOf(event.currentTarget) - 1;
        focusElement = tabRefs[prevTab] ?? tabRefs[tabRefs.length - 1];
        break;
      }
      default:
        break;
    }

    focusElement?.focus();
  };

  useEffect(() => {
    const tabContainer = tabItemListContainerRef.current;
    if (!tabContainer || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        requestAnimationFrame(() => {
          setShowTabArrows(entry.target.clientWidth < entry.target.scrollWidth);
        });
      }
    });

    resizeObserver.observe(tabContainer);
    return () => resizeObserver.disconnect();
  }, []);

  const handleRightClick = (event) => {
    event.preventDefault();
    if (tabItemListContainerRef.current) {
      tabItemListContainerRef.current.scrollLeft += 90;
    }
  };

  const handleLeftClick = (event) => {
    event.preventDefault();
    if (tabItemListContainerRef.current) {
      tabItemListContainerRef.current.scrollLeft -= 90;
    }
  };

  return (
    <div
      className="openapi-tabs__schema-tabs-container"
      style={{marginBottom: "1rem"}}
    >
      {showTabArrows && (
        <button
          type="button"
          className="openapi-tabs__arrow left"
          onClick={handleLeftClick}
          aria-label="Scroll schema tabs left"
        />
      )}
      <ul
        ref={tabItemListContainerRef}
        role="tablist"
        aria-orientation="horizontal"
        className={clsx(
          "openapi-tabs__schema-list-container",
          "tabs",
          {"tabs--block": block},
          className,
        )}
      >
        {tabValues.map(({value, label, attributes}) => (
          <li
            role="tab"
            tabIndex={selectedValue === value ? 0 : -1}
            aria-selected={selectedValue === value}
            key={value}
            ref={(tabControl) => {
              tabRefs.push(tabControl);
            }}
            onKeyDown={handleKeydown}
            onClick={handleTabChange}
            {...attributes}
            className={clsx(
              "tabs__item",
              "openapi-tabs__schema-item",
              attributes?.className,
              {active: selectedValue === value},
            )}
          >
            <span className="openapi-tabs__schema-label">{label ?? value}</span>
          </li>
        ))}
      </ul>
      {showTabArrows && (
        <button
          type="button"
          className="openapi-tabs__arrow right"
          onClick={handleRightClick}
          aria-label="Scroll schema tabs right"
        />
      )}
    </div>
  );
}

function TabContent({lazy, children, selectedValue}) {
  const childTabs = (Array.isArray(children) ? children : [children]).filter(
    Boolean,
  );
  const flattenedChildTabs = flatten(childTabs);

  if (lazy) {
    const selectedTabItem = flattenedChildTabs.find(
      (tabItem) => tabItem.props.value === selectedValue,
    );
    return selectedTabItem
      ? cloneElement(selectedTabItem, {className: "margin-top--md"})
      : null;
  }

  return <div className="margin-top--md">{childTabs}</div>;
}

function TabsComponent(props) {
  const tabs = useTabsContextValue(props);
  return (
    <TabsProvider value={tabs}>
      <div className="openapi-tabs__schema-container">
        <TabList {...props} {...tabs} />
        <TabContent {...props} {...tabs} />
      </div>
    </TabsProvider>
  );
}

export default function SchemaTabs(props) {
  const isBrowser = useIsBrowser();
  const children = Array.isArray(props.children)
    ? props.children.filter(Boolean)
    : props.children
      ? [props.children]
      : [];

  if (children.length === 0) {
    return null;
  }

  let sanitizedChildren;
  try {
    sanitizedChildren = sanitizeTabsChildren(children);
  } catch {
    return null;
  }

  if (
    !sanitizedChildren ||
    (Array.isArray(sanitizedChildren) && sanitizedChildren.length === 0)
  ) {
    return null;
  }

  return (
    <TabsComponent key={String(isBrowser)} {...props}>
      {sanitizedChildren}
    </TabsComponent>
  );
}
