// Debug script to check actual metadata format
// Run this in browser console to see the real event structure

async function debugMetadataFormat() {
  console.log('🔍 Debugging actual metadata format...');

  try {
    const { getGlobalNDKClient } = await import('./lib/nostr/ndk-relay-client.ts');
    const client = getGlobalNDKClient();

    // Fetch a few group metadata events
    const events = await client.fetchEvents({
      kinds: [39000], // Group metadata
      limit: 5
    });

    if (events && events.length > 0) {
      console.log(`📄 Found ${events.length} metadata events. Analyzing structure...`);

      events.forEach((event, i) => {
        console.log(`\n📋 Event ${i + 1}:`, {
          kind: event.kind,
          id: event.id?.slice(0, 8),
          pubkey: event.pubkey?.slice(0, 8),
          created_at: event.created_at,
          content: event.content,
          tags: event.tags
        });

        console.log('📄 Raw content:', `"${event.content}"`);
        console.log('📄 Content length:', event.content?.length || 0);
        console.log('📄 Content type:', typeof event.content);

        // Try to parse content as JSON
        if (event.content) {
          try {
            const parsedContent = JSON.parse(event.content);
            console.log('✅ Content parsed as JSON:', parsedContent);
          } catch (e) {
            console.log('❌ Content is NOT JSON:', e.message);
          }
        } else {
          console.log('⚠️ No content found');
        }

        console.log('🏷️ Tags analysis:');
        event.tags.forEach(tag => {
          console.log(`  - [${tag[0]}]: ${tag[1] || '(empty)'}`);
        });

        // Extract group ID
        const groupId = event.tags.find(t => t[0] === 'h' || t[0] === 'd')?.[1];
        console.log(`🆔 Extracted group ID: "${groupId}"`);
      });

      // Also check what the parseGroupMetadata util does if it exists
      try {
        const utils = await import('./lib/nostr/nip29/utils.ts');
        console.log('\n🛠️ Available utils:', Object.keys(utils));

        if (utils.parseGroupMetadata) {
          console.log('📖 Testing parseGroupMetadata util...');
          events.forEach((event, i) => {
            try {
              const parsed = utils.parseGroupMetadata(event.content);
              console.log(`Event ${i + 1} parsed:`, parsed);
            } catch (e) {
              console.log(`Event ${i + 1} parse error:`, e.message);
            }
          });
        }
      } catch (e) {
        console.log('🛠️ Utils not available or error:', e.message);
      }

    } else {
      console.log('❌ No metadata events found');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

console.log('🚀 Starting metadata format analysis...');
debugMetadataFormat();