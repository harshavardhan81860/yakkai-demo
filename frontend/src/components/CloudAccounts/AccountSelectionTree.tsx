import React, { useState, useMemo } from 'react';
import {
    Box, Checkbox, List, ListItemButton,
    ListItemIcon, ListItemText, Collapse, Typography, Chip
} from '@mui/material';
import {
    ExpandLess, ExpandMore, Folder, Cloud,
    Business, Storage
} from '@mui/icons-material';
import { DiscoveredAccount } from '../../services/cloudDiscoveryService';

interface AccountSelectionTreeProps {
    accounts: DiscoveredAccount[];
    selectedIds: Set<string>;
    onToggle: (ids: string[], selected: boolean) => void;
    provider: 'aws' | 'azure';
}

interface TreeNode {
    account: DiscoveredAccount;
    children: TreeNode[];
    id: string;
}

const TreeItem: React.FC<{
    node: TreeNode;
    level: number;
    selectedIds: Set<string>;
    onToggle: (ids: string[], selected: boolean) => void;
    provider: 'aws' | 'azure';
}> = ({ node, level, selectedIds, onToggle, provider }) => {
    const [expanded, setExpanded] = useState(true);

    const isContainer = !node.account.allows_resources;
    const hasChildren = node.children.length > 0;

    const isSelected = selectedIds.has(node.id);
    const isDisabled = node.account.already_imported;

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isDisabled) return;

        const idsToToggle = [node.id];
        const collect = (n: TreeNode) => {
            if (!n.account.already_imported) idsToToggle.push(n.id);
            n.children.forEach(collect);
        };

        collect(node);
        onToggle(idsToToggle, !isSelected);
    };

    const handleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(!expanded);
    }

    const getIcon = () => {
        if (provider === 'aws') {
            if (node.account.type === 'organizational_unit' || node.account.type === 'root') return <Folder color="action" />;
            if (node.account.type === 'management') return <Business color="primary" />;
            return <Storage color="action" />;
        } else {
            if (node.account.type === 'management_group') return <Folder color="action" />;
            if (node.account.type === 'tenant') return <Business color="primary" />;
            return <Cloud color="action" />;
        }
    };

    return (
        <Box>
            <ListItemButton
                sx={{ pl: level * 3, py: 0.5 }}
                onClick={handleExpand}
            >
                {hasChildren ? (
                    <ListItemIcon sx={{ minWidth: 24 }}>
                        {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                    </ListItemIcon>
                ) : (
                    <Box sx={{ minWidth: 24 }} />
                )}

                <Checkbox
                    edge="start"
                    checked={isSelected}
                    disabled={isDisabled}
                    tabIndex={-1}
                    disableRipple
                    size="small"
                    onClick={handleToggle}
                />

                <ListItemIcon sx={{ minWidth: 32, ml: 1 }}>
                    {getIcon()}
                </ListItemIcon>

                <ListItemText
                    primary={
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" sx={{ fontWeight: isContainer || node.account.type === 'management' || node.account.type === 'tenant' ? 600 : 400 }}>
                                {node.account.name}
                            </Typography>
                            {/* <Typography variant="caption" color="text.secondary">
                                {node.id}
                            </Typography> */}
                            {node.account.already_imported &&
                                <Chip label="Imported" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                            }
                        </Box>
                    }
                    secondary={
                        node.account.ou_path ?
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>
                                {node.account.ou_path}
                            </Typography> : null
                    }
                />
            </ListItemButton>

            {hasChildren && (
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        {node.children.map(child => (
                            <TreeItem
                                key={child.id}
                                node={child}
                                level={level + 1}
                                selectedIds={selectedIds}
                                onToggle={onToggle}
                                provider={provider}
                            />
                        ))}
                    </List>
                </Collapse>
            )}
        </Box>
    );
};

const AccountSelectionTree: React.FC<AccountSelectionTreeProps> = ({
    accounts,
    selectedIds,
    onToggle,
    provider
}) => {
    // Build Tree Structure
    const treeRun = useMemo(() => {
        const nodeMap = new Map<string, TreeNode>();
        const roots: TreeNode[] = [];

        // 1. Create Nodes
        accounts.forEach(acc => {
            const id = acc.account_id || acc.subscription_id || acc.management_group_id || acc.organizational_unit_id || acc.name;
            nodeMap.set(id, { account: acc, children: [], id });
        });

        // 2. Build Hierarchy
        accounts.forEach(acc => {
            const id = acc.account_id || acc.subscription_id || acc.management_group_id || acc.organizational_unit_id || acc.name;
            const node = nodeMap.get(id)!;

            const parentId = acc.parent_id;

            if (parentId && nodeMap.has(parentId)) {
                const parent = nodeMap.get(parentId)!;
                parent.children.push(node);
            } else {
                // If it's a child but parent isn't in scope (e.g. partial discovery?), it becomes a root here
                roots.push(node);
            }
        });

        // Loop to sort
        const depthSort = (nodes: TreeNode[]) => {
            nodes.sort((a, b) => {
                // Sort by type: Containers first?
                // Also sort by name
                const aIsContainer = !a.account.allows_resources;
                const bIsContainer = !b.account.allows_resources;
                if (aIsContainer && !bIsContainer) return -1;
                if (!aIsContainer && bIsContainer) return 1;
                return a.account.name.localeCompare(b.account.name);
            });
            nodes.forEach(n => depthSort(n.children));
        }

        depthSort(roots);

        return roots;
    }, [accounts]);

    return (
        <List sx={{ width: '100%', bgcolor: 'transparent' }}>
            {treeRun.map(root => (
                <TreeItem
                    key={root.id}
                    node={root}
                    level={0}
                    selectedIds={selectedIds}
                    onToggle={onToggle}
                    provider={provider}
                />
            ))}
            {treeRun.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    No hierarchy found.
                </Typography>
            )}
        </List>
    );
};

export default AccountSelectionTree;
