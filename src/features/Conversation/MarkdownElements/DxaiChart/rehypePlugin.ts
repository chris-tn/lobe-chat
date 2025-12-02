import { SKIP, visit } from 'unist-util-visit';

const CHART_TAG = 'dxai-chart';

function rehypeDxaiChart() {
  return (tree: any) => {
    visit(tree, (node, index, parent) => {
      if (node.type === 'element' && node.tagName === 'p' && node.children.length > 0) {
        const firstChild = node.children[0];
        if (firstChild.type === 'raw' && firstChild.value.startsWith(`<${CHART_TAG}`)) {
          // Extract dxai-chart attributes
          const attributes: Record<string, string> = {};
          const attributeRegex = /(\w+)="([^"]*)"/g;
          let match;
          while ((match = attributeRegex.exec(firstChild.value)) !== null) {
            attributes[match[1]] = match[2];
          }

          // Create new dxai-chart node
          const newNode = {
            children: [
              {
                type: 'text',
                value: node.children
                  .slice(1, -1)
                  .map((child: any) => {
                    if (child.type === 'raw') {
                      return child.value;
                    } else if (child.type === 'text') {
                      return child.value;
                    } else if (child.type === 'element' && child.tagName === 'a') {
                      return child.children[0].value;
                    }
                    return '';
                  })
                  .join('')
                  .trim(),
              },
            ],
            properties: attributes,
            tagName: CHART_TAG,
            type: 'element',
          };

          // Replace the original p node
          parent.children.splice(index, 1, newNode);
          return [SKIP, index];
        }
      }
      // Handle standalone <dxai-chart> tag
      else if (node.type === 'raw' && node.value.startsWith(`<${CHART_TAG}`)) {
        // Create new dxai-chart node
        const newNode = {
          children: [],
          properties: {},
          tagName: CHART_TAG,
          type: 'element',
        };

        // Replace the original node
        parent.children.splice(index, 1, newNode);
        return [SKIP, index];
      }
    });
  };
}

export default rehypeDxaiChart;

