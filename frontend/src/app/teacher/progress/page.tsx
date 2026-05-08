'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { ApiChild } from '@/lib/compliance';

interface BookWorkTemplate {
  category: string;
  requirementName: string;
}

interface LittleLambSection {
  title: string;
  subtitle?: string;
  isFlat?: boolean;
  items: Array<string | { label: string; activities: string[]; activityIntro?: string }>;
}

interface HonorTemplate {
  category: string;
  honorName: string;
}

interface BookWorkProgressItem {
  id: number;
  childId: number;
  category: string;
  requirementName: string;
  isCompleted: boolean;
  proofImageUrl?: string | null;
}

interface HonorProgressItem {
  id: number;
  childId: number;
  category: string;
  honorName: string;
  isCompleted: boolean;
  proofImageUrl?: string | null;
}

const DEFAULT_BOOK_WORK_TEMPLATES: BookWorkTemplate[] = [
  { category: 'Basic Requirements', requirementName: 'Basic Requirement 1 - Memory verse' },
  { category: 'Basic Requirements', requirementName: 'Basic Requirement 2 - Attendance' },
  { category: 'My God', requirementName: 'My God - Unit 1' },
  { category: 'My God', requirementName: 'My God - Unit 2' },
  { category: 'My Self', requirementName: 'My Self - Healthy Habits' },
  { category: 'My Self', requirementName: 'My Self - Exercise' },
  { category: 'My Family', requirementName: 'My Family - Family Tree' },
  { category: 'My Family', requirementName: 'My Family - Chores' },
  { category: 'My World', requirementName: 'My World - Nature Walk' },
  { category: 'My World', requirementName: 'My World - Community Service' },
];

const LITTLE_LAMB_SECTIONS: LittleLambSection[] = [
  {
    title: 'Basic Requirements',
    isFlat: true,
    items: [
      'Recite the Adventurer Pledge',
      'Complete the Story Listening I award',
      'Complete the Woolly Lamb award',
    ],
  },
  {
    title: 'My God',
    subtitle: 'choose at least one section',
    items: [
      {
        label: "God's Plan to Save Me",
        activities: [
          'Colour a story chart or lapbook about the following: The days of Creation',
          'Tell an adult one of the stories of Creation: creating animals, creating people, creating the Sabbath',
        ],
      },
      {
        label: "God's Message to Me",
        activities: [
          'Complete the My Friend Jesus award',
          'Complete the Little Boy Jesus award',
        ],
      },
      {
        label: "God's Power in My Life",
        activities: [
          'Have a regular family worship time in your home. Keep a record.',
          'Ask a parent or guardian what their favourite day of creation is.',
          'Complete the Bible Friends I award',
        ],
      },
    ],
  },
  {
    title: 'My Self',
    subtitle: 'choose at least one section',
    items: [
      { label: 'I Am Special', activities: ['Complete the Finger Play award'] },
      { label: 'I Can Make Wise Choices', activities: ['Complete the Sharing award'] },
      { label: 'I Can Care for My Body', activities: ['Complete the Healthy Foods award'] },
    ],
  },
  {
    title: 'My Family',
    subtitle: 'choose at least one section',
    items: [
      { label: 'I Have a Family', activities: ['Complete the My Family award'] },
      { label: 'Families Care for Each Other', activities: ['Complete the Special Helper award'] },
      { label: 'My Family Helps Me Care for Myself', activities: ['Complete the Healthy Me award'] },
    ],
  },
  {
    title: 'My World',
    subtitle: 'choose at least one section',
    items: [
      { label: 'The World of Friends', activities: ['Complete the Creation award'] },
      { label: 'The World of Other People', activities: ['Complete the Community Helpers award'] },
      {
        label: 'The World of Nature',
        activities: [
          'Complete at least two of the following Little Lamb level awards: Bodies of Water',
          'Complete at least two of the following Little Lamb level awards: Insects',
          'Complete at least two of the following Little Lamb level awards: Stars',
          'Complete at least two of the following Little Lamb level awards: Weather',
          'Complete at least two of the following Little Lamb level awards: Zoo Animals',
        ],
      },
    ],
  },
];

const EARLY_BIRD_BASIC_REQUIREMENTS = [
  'Recite the Adventurer Law',
  'Complete the Story Listening II award',
  'Complete the Birds award',
];

const EARLY_BIRD_MY_GOD_ITEMS: Array<{ label: string; activities: string[] }> = [
  {
    label: "God's Plan to Save Me",
    activities: [
      'Colour a story chart or lapbook about the people in the Bible who prayed: Samuel, Daniel, Jonah, David',
      'Learn how to pray independently',
      'Earn the Jesus Star award',
    ],
  },
  {
    label: "God's Message to Me",
    activities: [
      'Complete the Bible Friends II award',
    ],
  },
  {
    label: "God's Power in My Life",
    activities: [
      'Have a regular family worship time in your home. Keep a record',
      'Ask someone you know why they pray',
      "Complete the God's World award",
    ],
  },
];

const EARLY_BIRD_MY_SELF_ITEMS: Array<{ label: string; activities: string[] }> = [
  {
    label: 'I Am Special',
    activities: [
      'Complete the Left & Right award',
    ],
  },
  {
    label: 'I Can Make Wise Choices',
    activities: [
      'Complete the Manners Fun award',
    ],
  },
  {
    label: 'I Can Care for My Body',
    activities: [
      'Complete the Know Your Body award',
    ],
  },
];

const EARLY_BIRD_MY_FAMILY_ITEMS: Array<{ label: string; activities: string[] }> = [
  {
    label: 'I Have a Family',
    activities: [
      'Say the fifth commandment: "Honour your father and your mother" (Exodus 20:12)',
    ],
  },
  {
    label: 'Families Care for Each Other',
    activities: [
      'Complete the Helping at Home award',
    ],
  },
  {
    label: 'My Family Helps Me Care for Myself',
    activities: [
      'Complete the Fire Safety award',
    ],
  },
];

const EARLY_BIRD_MY_WORLD_ITEMS: Array<{ label: string; activities: string[] }> = [
  {
    label: 'The World of Friends',
    activities: [
      'Complete the My Community Friends award',
    ],
  },
  {
    label: 'The World of Other People',
    activities: [
      'Complete the Playing with Friends award',
    ],
  },
  {
    label: 'The World of Nature',
    activities: [
      'Complete the Scavenger Hunt award The World of Nature',
    ],
  },
  {
    label: 'Other awards that may be earned by Early Birds include',
    activities: [
      'Alphabet Fun',
      'Animal Homes',
      'Animals',
      'Beginning Biking',
      'Beginning Swimming',
      'Birds',
      'Crayons & Markers',
      'Gadgets and Sand,',
      'Jigsaw Puzzle,',
      'Pets.',
    ],
  },
];

const EARLY_BIRD_SECTIONS: LittleLambSection[] = LITTLE_LAMB_SECTIONS.map((section) => {
  if (section.title === 'Basic Requirements' && section.isFlat) {
    return {
      ...section,
      items: [...EARLY_BIRD_BASIC_REQUIREMENTS],
    };
  }

  if (section.title === 'My God' && !section.isFlat) {
    return {
      ...section,
      items: EARLY_BIRD_MY_GOD_ITEMS.map((item) => ({
        label: item.label,
        activities: [...item.activities],
      })),
    };
  }

  if (section.title === 'My Self' && !section.isFlat) {
    return {
      ...section,
      items: EARLY_BIRD_MY_SELF_ITEMS.map((item) => ({
        label: item.label,
        activities: [...item.activities],
      })),
    };
  }

  if (section.title === 'My Family' && !section.isFlat) {
    return {
      ...section,
      items: EARLY_BIRD_MY_FAMILY_ITEMS.map((item) => ({
        label: item.label,
        activities: [...item.activities],
      })),
    };
  }

  if (section.title === 'My World' && !section.isFlat) {
    return {
      ...section,
      items: EARLY_BIRD_MY_WORLD_ITEMS.map((item) => ({
        label: item.label,
        activities: [...item.activities],
      })),
    };
  }

  return {
    ...section,
    items: section.items.map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      return {
        ...item,
        activities: [...item.activities],
      };
    }),
  };
});

const BUSY_BEE_BASIC_REQUIREMENTS = [
  'Repeat from memory and accept the Adventurer Pledge',
  'Complete the Reading I award',
  'Complete the Flowers award',
];

const BUSY_BEE_MY_GOD_ITEMS: Array<{ label: string; activities: string[] }> = [
  {
    label: "God's Plan to Save Me",
    activities: [
      'Create a story chart or lap-book showing the order in which these events took place: Creation, The first sin, Jesus cares for me today, Jesus comes again, Heaven.',
      'Draw a picture or tell about one of the stories above to show someone how much Jesus cares for you.',
    ],
  },
  {
    label: "God's Message to Me",
    activities: [
      'Complete the Bible I award.',
    ],
  },
  {
    label: "God's Power in My Life",
    activities: [
      'Spend regular quiet time with Jesus to talk with Him and learn about Him. Keep a record.',
      'Ask two people how they show other people that Jesus cares for them.',
      'Complete the Delightful Sabbath award.',
    ],
  },
];

const BUSY_BEE_MY_SELF_ITEMS: Array<{ label: string; activities: string[] }> = [
  {
    label: 'I Am Special',
    activities: [
      'Make a booklet showing different people who care for you as Jesus would.',
    ],
  },
  {
    label: 'I Can Make Wise Choices',
    activities: [
      'Name at least four feelings.',
      'Play a feelings game.',
    ],
  },
  {
    label: 'I Can Care for My Body',
    activities: [
      'Complete the Health Specialist award.',
    ],
  },
];

const BUSY_BEE_MY_FAMILY_ITEMS: Array<{ label: string; activities: string[] }> = [
  {
    label: 'I Have a Family',
    activities: [
      'Draw or cut out a picture showing something special about each member of your family.',
    ],
  },
  {
    label: 'Families Care for Each Other',
    activities: [
      'Discover what the fifth commandment (Exodus 20:12) tells you about families.',
      'Act out three ways you can honour your family.',
      'Complete the Home Helper II award.',
    ],
  },
  {
    label: 'My Family Helps Me Care for Myself',
    activities: [
      'Complete the Safety Specialist award.',
    ],
  },
];

const BUSY_BEE_MY_WORLD_ITEMS: Array<{ label: string; activities: string[] }> = [
  {
    label: 'The World of Friends',
    activities: [
      'Complete the Listening award.',
    ],
  },
  {
    label: 'The World of Other People',
    activities: [
      'Tell about the volunteer work people do in your church. Find a way to help them.',
      'Find a way to help them.',
    ],
  },
  {
    label: 'The World of Nature',
    activities: [
      'Complete the Friend of Animals award.',
      'As time allows, Other awards that may be earned by Busy Bees include: Artist, Butterfly, Buttons, Fish, Guide, Music, Potato, Sand Art, Spotter, Swimmer I',
    ],
  },
];

const BUSY_BEE_SECTIONS: LittleLambSection[] = LITTLE_LAMB_SECTIONS.map((section) => {
  if (section.title === 'Basic Requirements' && section.isFlat) {
    return {
      ...section,
      items: [...BUSY_BEE_BASIC_REQUIREMENTS],
    };
  }

  if (section.title === 'My God' && !section.isFlat) {
    return {
      ...section,
      items: BUSY_BEE_MY_GOD_ITEMS.map((item) => ({
        label: item.label,
        activities: [...item.activities],
      })),
    };
  }

  if (section.title === 'My Self' && !section.isFlat) {
    return {
      ...section,
      items: BUSY_BEE_MY_SELF_ITEMS.map((item) => ({
        label: item.label,
        activities: [...item.activities],
      })),
    };
  }

  if (section.title === 'My Family' && !section.isFlat) {
    return {
      ...section,
      items: BUSY_BEE_MY_FAMILY_ITEMS.map((item) => ({
        label: item.label,
        activities: [...item.activities],
      })),
    };
  }

  if (section.title === 'My World' && !section.isFlat) {
    return {
      ...section,
      items: BUSY_BEE_MY_WORLD_ITEMS.map((item) => ({
        label: item.label,
        activities: [...item.activities],
      })),
    };
  }

  return {
    ...section,
    items: section.items.map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      return {
        ...item,
        activities: [...item.activities],
      };
    }),
  };
});

const SUNBEAM_BASIC_REQUIREMENTS = [
  'Repeat from memory and accept the Adventurer Law.',
  'Complete the Reading II Award',
  'Complete the Seasons Award',
];

const SUNBEAM_MY_GOD_ITEMS: Array<{ label: string; activities: string[] }> = [
  {
    label: "God's Plan to Save Me",
    activities: [
      'Create a story chart showing Jesus\' life: Birth, baptism, miracles, parables, death, resurrection and return to heaven.',
      'Find a method to creatively tell about one of the stories above to show someone the joy of being saved by Jesus.',
    ],
  },
  {
    label: "God's Message to Me",
    activities: [
      'Complete the Bible II Award',
    ],
  },
  {
    label: "God's Power in My Life",
    activities: [
      'Spend regular quiet time with Jesus to talk with Him and learn about Him. Keep a record.',
      'Ask three people their favourite "Jesus story" (story from the gospels) and why.',
      'Complete the Parables of Jesus Award',
    ],
  },
];

const SUNBEAM_MY_SELF_ITEMS: Array<{ label: string; activities: string[] }> = [
  {
    label: 'I Am Special',
    activities: [
      'Make a tracing of yourself. Decorate it with pictures and words which tell good things about you.',
      'Share your drawing with your group.',
    ],
  },
  {
    label: 'I Can Make Wise Choices',
    activities: [
      'Participate in an activity or game about choices.',
    ],
  },
  {
    label: 'I Can Care for My Body',
    activities: [
      'Complete the Fitness Fun Award',
    ],
  },
];

const SUNBEAM_MY_FAMILY_ITEMS: Array<{ label: string; activities: string[] }> = [
  {
    label: 'I Have a Family',
    activities: [
      'Ask each member of your family to tell some of their favourite memories.',
    ],
  },
  {
    label: 'Families Care for Each Other',
    activities: [
      'Show how Jesus can help you deal with disagreements. Use: Puppets, Role Playing, Etc.',
      'Complete the Acts of Kindness Award',
    ],
  },
  {
    label: 'My Family Helps Me Care for Myself',
    activities: [
      'Complete the Road Safety Award',
    ],
  },
];

const SUNBEAM_MY_WORLD_ITEMS: Array<{ label: string; activities: string[] }> = [
  {
    label: 'The World of Friends',
    activities: [
      'Complete the Courtesy Award.',
    ],
  },
  {
    label: 'The World of Other People',
    activities: [
      'Explore your neighborhood. List things that are good and things you could help make better.',
      'From your list choose ways and spend time making your neighborhood better.',
    ],
  },
  {
    label: 'The World of Nature',
    activities: [
      'Complete the Friend of Nature Award',
    ],
  },
];

const SUNBEAM_SECTIONS: LittleLambSection[] = LITTLE_LAMB_SECTIONS.map((section) => {
  if (section.title === 'Basic Requirements' && section.isFlat) {
    return {
      ...section,
      items: [...SUNBEAM_BASIC_REQUIREMENTS],
    };
  }

  if (section.title === 'My God' && !section.isFlat) {
    return {
      ...section,
      items: SUNBEAM_MY_GOD_ITEMS.map((item) => ({
        label: item.label,
        activities: [...item.activities],
      })),
    };
  }

  if (section.title === 'My Self' && !section.isFlat) {
    return {
      ...section,
      items: SUNBEAM_MY_SELF_ITEMS.map((item) => ({
        label: item.label,
        activities: [...item.activities],
      })),
    };
  }

  if (section.title === 'My Family' && !section.isFlat) {
    return {
      ...section,
      items: SUNBEAM_MY_FAMILY_ITEMS.map((item) => ({
        label: item.label,
        activities: [...item.activities],
      })),
    };
  }

  if (section.title === 'My World' && !section.isFlat) {
    return {
      ...section,
      items: SUNBEAM_MY_WORLD_ITEMS.map((item) => ({
        label: item.label,
        activities: [...item.activities],
      })),
    };
  }

  return {
    ...section,
    items: section.items.map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      return {
        ...item,
        activities: [...item.activities],
      };
    }),
  };
});

const BUILDER_BASIC_REQUIREMENTS = [
  'Repeat from memory the Adventurer Pledge and Law',
  'Explain the Pledge and Law through art or skit',
  'Complete the Reading III Award',
  'Complete the Building Blocks Award',
];

const HELPING_HANDS_BASIC_REQUIREMENTS: Array<string | { label: string; activities: string[]; activityIntro?: string }> = [
  {
    label: 'Repeat from memory and accept the Adventurer Pledge',
    activities: [
      'Demonstrate real life situations where the Pledge and Law help you to respond to situations in a Christ-like way. Illustrate or act out those situations',
    ],
  },
  'Complete the Reading IV Award',
  'Complete the Hands of Service Award',
];

const HELPING_HANDS_MY_GOD_ITEMS: Array<{ label: string; activities: string[] }> = [
  {
    label: "God's Plan to Save Me",
    activities: [
      'Create a story chart or lap-book showing the order in which these events took place: Paul, Martin Luther, Ellen White & Yourself.',
      'Plan and act out a skit or write a news story about one of those stories above, to show how a person is a spiritual hero.',
    ],
  },
  {
    label: "God's Message to Me",
    activities: [
      'Complete the Bible IV Award.',
    ],
  },
  {
    label: "God's Power in My Life",
    activities: [
      'Spend regular quiet time with Jesus to talk with Him and learn about Him. Keep a record.',
      'Ask three people (other than family) why they decided to give their life to Jesus OR earn the Steps to Jesus Award.',
      'Complete the My Church Award.',
    ],
  },
];

const HELPING_HANDS_MY_SELF_ITEMS: Array<{ label: string; activities: string[] }> = [
  {
    label: 'I Am Special',
    activities: [
      'List some special interests and abilities God has given you.',
      'Demonstrate and share your talent by earning one of the Adventurer Awards that allow expressions of personal talents.',
    ],
  },
  {
    label: 'I Can Make Wise Choices',
    activities: [
      'Learn the steps of good decision-making. Explain or demonstrate how to use them to solve two real-life problems.',
    ],
  },
  {
    label: 'I Can Care for My Body',
    activities: [
      'Complete the Hygiene Award.',
    ],
  },
];

const HELPING_HANDS_MY_FAMILY_ITEMS: Array<{ label: string; activities: string[] }> = [
  {
    label: 'I Have a Family',
    activities: [
      'Make a family flag or banner.',
      'Complete the My Picture Book Award.',
    ],
  },
  {
    label: 'Families Care for Each Other',
    activities: [
      'Help plan a special family worship, family night or family outing. Report what you did to your group.',
    ],
  },
  {
    label: 'My Family Helps Me Care for Myself',
    activities: [
      'Complete the Cooperation Award.',
    ],
  },
];

const HELPING_HANDS_MY_WORLD_ITEMS: Array<{ label: string; activities: string[] }> = [
  {
    label: 'The World of Friends',
    activities: [
      'Complete the Early Adventist Pioneer Award.',
    ],
  },
  {
    label: 'The World of Other People',
    activities: [
      'Complete the Country Fun Award.',
    ],
  },
  {
    label: 'The World of Nature',
    activities: [
      'Complete two Nature Awards not previously earned.',
    ],
  },
];

const BUILDER_MY_GOD_ITEMS: Array<{ label: string; activities: string[] }> = [
  {
    label: "God's Plan to Save Me",
    activities: [
      'Create a story chart showing the order in which these stories took place: Noah, Abraham, Moses, Ruth, David, Daniel, Esther',
      'Make a diorama, poem, or song about one of the stories above to show someone how to live for God',
    ],
  },
  {
    label: "God's Message to Me",
    activities: [
      'Complete the Bible III (red) (formerly titled Bible II) Award',
    ],
  },
  {
    label: "God's Power in My Life",
    activities: [
      'Spend regular quiet time with Jesus to talk with Him and learn about Him. Keep a record',
      'Ask three people who their favourite Bible hero is (other than Jesus) and why',
      'Complete the Prayer Award',
    ],
  },
];

const BUILDER_MY_SELF_ITEMS: Array<{ label: string; activities: string[] }> = [
  {
    label: 'I Am Special',
    activities: [
      'Put together a scrapbook, poster, or collage, showing some things you can do to serve God and others',
    ],
  },
  {
    label: 'I Can Make Wise Choices',
    activities: [
      'Complete the Media Critic Award',
      'Complete the Wise Steward Award',
    ],
  },
  {
    label: 'I Can Care for My Body',
    activities: [
      'Complete the Temperance Award',
    ],
  },
];

const BUILDER_MY_FAMILY_ITEMS: Array<{ label: string; activities: string[] }> = [
  {
    label: 'I Have a Family',
    activities: [
      'Share one way your family has changed over time. Share how these changes make you feel',
      'Find a story in the Bible about a family like yours',
    ],
  },
  {
    label: 'Families Care for Each Other',
    activities: [
      'Learn how to play a game through which each of your family members show appreciation to each of the other members of the family',
      'Complete the Family Helper Award',
    ],
  },
  {
    label: 'My Family Helps Me Care for Myself',
    activities: [
      'Complete the First Aid Helper Award',
    ],
  },
];

const BUILDER_MY_WORLD_ITEMS: Array<{ label: string; activities: string[]; activityIntro?: string }> = [
  {
    label: 'The World of Friends',
    activities: [
      'Complete the Caring Friend Award',
    ],
  },
  {
    label: 'The World of Other People',
    activities: [
      'Know and explain your national anthem and flag',
      "Name your country's capital, and the leader of your country",
    ],
  },
  {
    label: 'The World of Nature',
    activityIntro: 'Complete a nature Award not previously earned, such as:',
    activities: [
      'Bodies of Water',
      'Insects',
      'Stars',
      'Weather or',
      'Zoo Animals',
    ],
  },
];

const BUILDER_SECTIONS: LittleLambSection[] = LITTLE_LAMB_SECTIONS.map((section) => {
  const builderSubtitle = section.isFlat ? undefined : 'all required';

  if (section.title === 'Basic Requirements' && section.isFlat) {
    return {
      ...section,
      subtitle: builderSubtitle,
      items: [...BUILDER_BASIC_REQUIREMENTS],
    };
  }

  if (section.title === 'My God' && !section.isFlat) {
    return {
      ...section,
      subtitle: builderSubtitle,
      items: BUILDER_MY_GOD_ITEMS.map((item) => ({
        label: item.label,
        activities: [...item.activities],
      })),
    };
  }

  if (section.title === 'My Self' && !section.isFlat) {
    return {
      ...section,
      subtitle: builderSubtitle,
      items: BUILDER_MY_SELF_ITEMS.map((item) => ({
        label: item.label,
        activities: [...item.activities],
      })),
    };
  }

  if (section.title === 'My Family' && !section.isFlat) {
    return {
      ...section,
      subtitle: builderSubtitle,
      items: BUILDER_MY_FAMILY_ITEMS.map((item) => ({
        label: item.label,
        activities: [...item.activities],
      })),
    };
  }

  if (section.title === 'My World' && !section.isFlat) {
    return {
      ...section,
      subtitle: builderSubtitle,
      items: BUILDER_MY_WORLD_ITEMS.map((item) => ({
        label: item.label,
        activities: [...item.activities],
        activityIntro: item.activityIntro,
      })),
    };
  }

  return {
    ...section,
    subtitle: builderSubtitle,
    items: section.items.map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      return {
        ...item,
        activities: [...item.activities],
      };
    }),
  };
});

const HELPING_HANDS_SECTIONS: LittleLambSection[] = BUILDER_SECTIONS.map((section) => {
  if (section.title === 'Basic Requirements' && section.isFlat) {
    return {
      ...section,
      items: HELPING_HANDS_BASIC_REQUIREMENTS.map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        return {
          ...item,
          activities: [...item.activities],
        };
      }),
    };
  }

  if (section.title === 'My God' && !section.isFlat) {
    return {
      ...section,
      items: HELPING_HANDS_MY_GOD_ITEMS.map((item) => ({
        label: item.label,
        activities: [...item.activities],
      })),
    };
  }

  if (section.title === 'My Self' && !section.isFlat) {
    return {
      ...section,
      items: HELPING_HANDS_MY_SELF_ITEMS.map((item) => ({
        label: item.label,
        activities: [...item.activities],
      })),
    };
  }

  if (section.title === 'My Family' && !section.isFlat) {
    return {
      ...section,
      items: HELPING_HANDS_MY_FAMILY_ITEMS.map((item) => ({
        label: item.label,
        activities: [...item.activities],
      })),
    };
  }

  if (section.title === 'My World' && !section.isFlat) {
    return {
      ...section,
      items: HELPING_HANDS_MY_WORLD_ITEMS.map((item) => ({
        label: item.label,
        activities: [...item.activities],
      })),
    };
  }

  return {
    ...section,
    items: section.items.map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      return {
        ...item,
        activities: [...item.activities],
      };
    }),
  };
});

function getLittleLambItemLabel(item: string | { label: string; activities: string[]; activityIntro?: string }) {
  return typeof item === 'string' ? item : item.label;
}

function getLittleLambActivities(item: string | { label: string; activities: string[]; activityIntro?: string }) {
  return typeof item === 'string' ? [] : item.activities;
}

function getLittleLambActivityIntro(item: string | { label: string; activities: string[]; activityIntro?: string }) {
  return typeof item === 'string' ? '' : (item.activityIntro ?? '');
}

function buildProofValue(images: string[]) {
  if (images.length <= 1) {
    return images[0] ?? '';
  }

  return JSON.stringify(images);
}

function getProofImages(proof?: string | null) {
  if (!proof) {
    return [];
  }

  try {
    const parsed = JSON.parse(proof);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed;
    }
  } catch {
    return [proof];
  }

  return [proof];
}

const HONOR_TEMPLATES: HonorTemplate[] = [
  { category: 'My God', honorName: 'My Bible' },
  { category: 'My God', honorName: 'Prayer' },
  { category: 'My Self', honorName: 'Health' },
  { category: 'My Self', honorName: 'Exercise' },
  { category: 'My Family', honorName: 'Cooking' },
  { category: 'My Family', honorName: 'Chores' },
  { category: 'My World', honorName: 'Nature' },
  { category: 'My World', honorName: 'Art' },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function TeacherProgressPage() {
  const [assignedClass, setAssignedClass] = useState('');
  const [children, setChildren] = useState<ApiChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [bookWork, setBookWork] = useState<BookWorkProgressItem[]>([]);
  const [honors, setHonors] = useState<HonorProgressItem[]>([]);
  const [proofByKey, setProofByKey] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'bookwork' | 'honors'>('bookwork');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');

  const selected = useMemo(
    () => children.find((child) => child.id === selectedChildId) ?? null,
    [children, selectedChildId]
  );

  const activeBookWorkTemplates = useMemo(
    () => DEFAULT_BOOK_WORK_TEMPLATES,
    []
  );

  const [selectedBySection, setSelectedBySection] = useState<Record<string, string>>({});
  const [lockedBySection, setLockedBySection] = useState<Record<string, string>>({});
  const [activityProofByKey, setActivityProofByKey] = useState<Record<string, Record<string, string>>>({});

  const normalizedAssignedClass = assignedClass.trim().toLowerCase();
  const isLittleLambClass = normalizedAssignedClass === 'little lamb';
  const isEarlyBirdClass = normalizedAssignedClass === 'early bird' || normalizedAssignedClass === 'early birds';
  const isBusyBeeClass = normalizedAssignedClass === 'busy bee' || normalizedAssignedClass === 'busy bees';
  const isSunbeamClass = normalizedAssignedClass === 'sunbeam' || normalizedAssignedClass === 'sunbeams';
  const isBuilderClass = normalizedAssignedClass === 'builder' || normalizedAssignedClass === 'builders';
  const isHelpingHandsClass = normalizedAssignedClass === 'helping hands' || normalizedAssignedClass === 'helping hand';
  const isBuilderStyleClass = isBuilderClass || isHelpingHandsClass;
  const activityBookUrl = isLittleLambClass
    ? '/documents/Little-Lamb-Activity-2021.pdf'
    : isEarlyBirdClass
      ? '/documents/Early-Bird-Activity-2021.pdf'
      : isBusyBeeClass
        ? '/documents/Busy-Bee-Activity-2021.pdf'
        : isSunbeamClass
          ? '/documents/Sunbeam-Activity-2021-LR.pdf'
          : isBuilderClass
            ? '/documents/Builder-Activity-2021-LR.pdf'
            : isHelpingHandsClass
              ? '/documents/Helping-Hands-Activity-2021-LR.pdf'
      : '';

  const classSections = useMemo(() => {
    if (isLittleLambClass) return LITTLE_LAMB_SECTIONS;
    if (isEarlyBirdClass) return EARLY_BIRD_SECTIONS;
    if (isBusyBeeClass) return BUSY_BEE_SECTIONS;
    if (isSunbeamClass) return SUNBEAM_SECTIONS;
    if (isBuilderClass) return BUILDER_SECTIONS;
    if (isHelpingHandsClass) return HELPING_HANDS_SECTIONS;
    return null;
  }, [isBuilderClass, isBusyBeeClass, isEarlyBirdClass, isHelpingHandsClass, isLittleLambClass, isSunbeamClass]);

  const bookWorkLabel = classSections ? `${assignedClass.trim() || 'Class'} Checklist` : 'Book Work';

  const sectionTitleBadgeClass = isEarlyBirdClass
    ? 'bg-[#39a854]'
    : isBusyBeeClass
      ? 'bg-[#f0ce2a]'
      : isSunbeamClass
        ? 'bg-[#f06b35]'
        : isHelpingHandsClass
          ? 'bg-[#9b2e43]'
        : isBuilderStyleClass
          ? 'bg-[#f08a2a]'
          : 'bg-[#1e8fbf]';

  const loadProgress = async (childId: number) => {
    const [bookData, honorsData, lockedData] = await Promise.all([
      apiFetch(`/api/progress/book-work/${childId}`) as Promise<BookWorkProgressItem[]>,
      apiFetch(`/api/progress/honors/${childId}`) as Promise<HonorProgressItem[]>,
      apiFetch(`/api/progress/locked-topics/${childId}`) as Promise<{ section: string; topic: string }[]>,
    ]);
    setBookWork(Array.isArray(bookData) ? bookData : []);
    setHonors(Array.isArray(honorsData) ? honorsData : []);
    const lockedMap: Record<string, string> = {};
    if (Array.isArray(lockedData)) {
      for (const entry of lockedData) {
        lockedMap[entry.section] = entry.topic;
      }
    }
    setLockedBySection(lockedMap);
    setSelectedBySection((prev) => ({ ...prev, ...lockedMap }));
    
    // Restore activity proofs from completed entries
    const apMap: Record<string, Record<string, string>> = {};
    if (Array.isArray(bookData)) {
      for (const entry of bookData) {
        if (entry.isCompleted && entry.proofImageUrl) {
          const key = buildBookKey(entry.category, entry.requirementName);
          try {
            const parsed = JSON.parse(entry.proofImageUrl);
            if (typeof parsed === 'object' && !Array.isArray(parsed)) {
              apMap[key] = parsed;
            }
          } catch {
            // Not a JSON object, skip
          }
        }
      }
    }
    setActivityProofByKey(apMap);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        try {
          const classData = await apiFetch('/api/teachers/my-class') as { assignedClass?: string | null };
          setAssignedClass(classData.assignedClass ?? '');
        } catch {
          setAssignedClass('');
        }

        const childrenData = await apiFetch('/api/children') as ApiChild[];
        const list = Array.isArray(childrenData) ? childrenData : [];
        setChildren(list);

        if (list.length > 0) {
          const firstId = list[0].id;
          setSelectedChildId(firstId);
          await loadProgress(firstId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load progress data.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const selectChild = async (childId: number) => {
    setSelectedChildId(childId);
    setProofByKey({});
    setActivityProofByKey({});
    setLockedBySection({});
    setSelectedBySection({});
    try {
      await loadProgress(childId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load child progress.');
    }
  };

  const completedBook = classSections
    ? classSections.reduce((acc, s) => {
        if (s.isFlat) {
          return acc + s.items.filter((item) => {
            const label = getLittleLambItemLabel(item);
            return bookWork.some((p) => p.category === s.title && p.requirementName === label && p.isCompleted);
          }).length;
        }
        return acc + (bookWork.some((p) => p.category === s.title && p.isCompleted) ? 1 : 0);
      }, 0)
    : bookWork.filter((item) => item.isCompleted).length;
  const completedHonors = honors.filter((item) => item.isCompleted).length;
  const totalBook = classSections
    ? classSections.reduce((acc, s) => acc + (s.isFlat ? s.items.length : 1), 0)
    : activeBookWorkTemplates.length;
  const totalHonors = HONOR_TEMPLATES.length;
  const overallTotal = totalBook + totalHonors;
  const overallCompleted = completedBook + completedHonors;
  const overallPct = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;

  const buildBookKey = (category: string, requirementName: string) => `bookwork:${category}:${requirementName}`;
  const buildHonorKey = (category: string, honorName: string) => `honor:${category}:${honorName}`;

  const onProofSelected = async (key: string, files?: FileList | null, maxFiles = 1) => {
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files).slice(0, maxFiles);
    if (files.length > maxFiles) {
      setError(`You can upload up to ${maxFiles} photos for this section.`);
    } else {
      setError('');
    }

    const dataUrls = await Promise.all(selectedFiles.map((file) => fileToDataUrl(file)));
    setProofByKey((prev) => ({ ...prev, [key]: buildProofValue(dataUrls) }));
  };

  const completeBookWork = async (category: string, requirementName: string) => {
    if (!selected) return;
    const key = buildBookKey(category, requirementName);
    const actProofs = activityProofByKey[key];
    if (!actProofs || Object.keys(actProofs).length === 0) {
      setError('Please upload photos for all activities before marking complete.');
      return;
    }

    try {
      setSavingKey(key);
      setError('');
      const proof = JSON.stringify(actProofs);
      await apiFetch('/api/progress/book-work/complete', {
        method: 'POST',
        body: JSON.stringify({
          childId: selected.id,
          category,
          requirementName,
          proofImageUrl: proof,
        }),
      });
      await loadProgress(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete requirement.');
    } finally {
      setSavingKey('');
    }
  };

  const completeHonor = async (category: string, honorName: string) => {
    if (!selected) return;
    const key = buildHonorKey(category, honorName);
    const proof = proofByKey[key];
    if (!proof) {
      setError('Please upload a photo proof before marking complete.');
      return;
    }

    try {
      setSavingKey(key);
      setError('');
      await apiFetch('/api/progress/honors/complete', {
        method: 'POST',
        body: JSON.stringify({
          childId: selected.id,
          category,
          honorName,
          proofImageUrl: proof,
        }),
      });
      await loadProgress(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete honor.');
    } finally {
      setSavingKey('');
    }
  };

  const lockSection = async (sectionTitle: string, topic: string) => {
    if (!selected) return;
    try {
      await apiFetch('/api/progress/locked-topics', {
        method: 'POST',
        body: JSON.stringify({ childId: selected.id, section: sectionTitle, topic }),
      });
      setLockedBySection((prev) => ({ ...prev, [sectionTitle]: topic }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lock topic.');
    }
  };

  const unlockSection = async (sectionTitle: string) => {
    if (!selected) return;
    try {
      await apiFetch(`/api/progress/locked-topics/${selected.id}/${encodeURIComponent(sectionTitle)}`, {
        method: 'DELETE',
      });
      setLockedBySection((prev) => {
        const next = { ...prev };
        delete next[sectionTitle];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock topic.');
    }
  };

  return (
    <div className="px-3 py-4 sm:p-6 max-w-6xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">{assignedClass ? `${assignedClass} Class` : 'My Class'}</h1>
      <p className="text-sm text-gray-500 mb-6">{bookWorkLabel} and Honors tabs are shown below. Teachers can only complete work with photo proof.</p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading class progress...</p>}

      {!loading && children.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
          No learners found for your assigned class.
        </div>
      )}

      {!loading && children.length > 0 && selected && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">My Student</label>
                <select
                  value={selected.id}
                  onChange={(e) => void selectChild(Number(e.target.value))}
                  className="w-full md:w-96 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                >
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name} ({child.class})
                    </option>
                  ))}
                </select>
              </div>

              {activityBookUrl && (
                <a
                  href={activityBookUrl}
                  download
                  className="inline-flex items-center justify-center rounded-lg bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#254a78]"
                >
                  Download Activity Book
                </a>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <div>
                <h2 className="text-base font-semibold text-gray-800">{selected.name}</h2>
                <p className="text-xs text-gray-400">{selected.class} · {overallCompleted}/{overallTotal} completed</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-[#1e3a5f]">{overallPct}%</span>
              </div>
            </div>

            <div className="bg-gray-200 rounded-full h-2 mb-6">
              <div
                className="bg-[#1e3a5f] h-2 rounded-full transition-all"
                style={{ width: `${overallPct}%` }}
              />
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('bookwork')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'bookwork' ? 'bg-[#1e3a5f] text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                {bookWorkLabel} ({completedBook}/{totalBook})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('honors')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'honors' ? 'bg-[#1e3a5f] text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Honors ({completedHonors}/{totalHonors})
              </button>
            </div>

            <div className="space-y-2">
              {activeTab === 'bookwork' && classSections && (
                <div className="space-y-4">
                  {classSections.map((section) => {
                    if (section.isFlat) {
                      return (
                        <div key={section.title}>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <h3 className={`inline-flex items-center rounded-r-2xl px-3 py-1 text-lg font-bold leading-none text-white ${sectionTitleBadgeClass}`}>
                              {section.title}
                            </h3>
                            {section.subtitle && <span className="text-sm text-gray-600 italic">[{section.subtitle}]</span>}
                          </div>
                          <div className="space-y-2">
                            {section.items.map((item) => {
                              const label = getLittleLambItemLabel(item);
                              const activities = getLittleLambActivities(item);
                              const existing = bookWork.find((p) => p.category === section.title && p.requirementName === label);
                              const key = buildBookKey(section.title, label);
                              const completed = Boolean(existing?.isCompleted);
                              const proofImages = getProofImages(proofByKey[key] || existing?.proofImageUrl);
                              return (
                                <div key={key} className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <p className={`text-sm font-medium ${completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{label}</p>
                                    {completed ? (
                                      <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">Completed</span>
                                    ) : (
                                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                        <label className="text-xs font-semibold border border-[#1e3a5f] text-[#1e3a5f] px-3 py-1.5 rounded-lg cursor-pointer hover:bg-[#1e3a5f] hover:text-white transition-colors">
                                          <input type="file" className="hidden" accept="image/*" capture="environment" onChange={(e) => void onProofSelected(key, e.target.files)} />
                                          {proofByKey[key] ? 'Change Proof' : 'Capture / Upload'}
                                        </label>
                                        <button type="button" onClick={() => void completeBookWork(section.title, label)} disabled={savingKey === key || !proofByKey[key]} className="text-xs font-semibold bg-[#1e3a5f] text-white px-3 py-1.5 rounded-lg disabled:opacity-50">
                                          {savingKey === key ? 'Saving...' : 'Mark Complete'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  {activities.length > 0 && (
                                    <div className="mt-2 rounded-lg bg-white/80 px-3 py-3 border border-blue-100 space-y-2">
                                      {activities.map((activity, idx) => (
                                        <p key={`${key}:flat-activity:${idx}`} className="text-xs font-medium text-gray-800">
                                          {String.fromCharCode(97 + idx)}. {activity}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                  {!completed && proofByKey[key] && <p className="mt-2 text-xs text-green-600 font-medium">Photo attached</p>}
                                  {proofImages.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {proofImages.map((image, index) => (
                                        <img key={`${key}:${index}`} src={image} alt="Proof" className="h-16 w-16 rounded object-cover border border-gray-200" />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    if (isBuilderStyleClass) {
                      return (
                        <div key={section.title} className="p-3 rounded-xl border border-blue-100 bg-blue-50/30">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className={`inline-flex items-center rounded-r-2xl px-3 py-1 text-lg font-bold leading-none text-white ${sectionTitleBadgeClass}`}>
                              {section.title}
                            </h3>
                            {section.subtitle && <span className="text-sm text-gray-600 italic">[{section.subtitle}]</span>}
                          </div>

                          <div className="space-y-3">
                            {section.items.map((item) => {
                              const label = getLittleLambItemLabel(item);
                              const activities = getLittleLambActivities(item);
                              const activityIntro = getLittleLambActivityIntro(item);
                              const key = buildBookKey(section.title, label);
                              const existing = bookWork.find((p) => p.category === section.title && p.requirementName === label);
                              const completed = Boolean(existing?.isCompleted);
                              const proofCount = Object.keys(activityProofByKey[key] ?? {}).length;

                              return (
                                <div key={key} className="rounded-lg border border-blue-100 bg-white/80 p-3">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                    <p className={`text-sm font-semibold ${completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{label}</p>
                                    {completed ? (
                                      <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">Completed</span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => void completeBookWork(section.title, label)}
                                        disabled={savingKey === key || proofCount === 0}
                                        className="text-xs font-semibold bg-[#1e3a5f] text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                                      >
                                        {savingKey === key ? 'Saving...' : 'Mark Complete'}
                                      </button>
                                    )}
                                  </div>

                                  {activities.length > 0 && (
                                    <>
                                      {activityIntro && (
                                        <p className="mb-2 text-sm font-medium text-gray-800">a. {activityIntro}</p>
                                      )}
                                      <div className="rounded-lg bg-white/80 px-3 py-3 border border-blue-100 space-y-2">
                                        {activities.map((activity, idx) => {
                                          const actKey = `${key}:activity:${idx}`;
                                          const actProof = activityProofByKey[key]?.[String(idx)] ?? '';
                                          const actImages = getProofImages(actProof);

                                          return (
                                            <div key={actKey} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-2 rounded bg-gray-50 border border-gray-100">
                                              <div className="flex-1">
                                                <p className="text-xs font-medium text-gray-800">{String.fromCharCode(97 + idx)}. {activity}</p>
                                                {actImages.length > 0 && (
                                                  <div className="mt-1 flex flex-wrap gap-1">
                                                    {actImages.map((img, imgIdx) => (
                                                      <button
                                                        key={`${actKey}:${imgIdx}`}
                                                        type="button"
                                                        title="View photo"
                                                        className="relative h-10 w-10 overflow-hidden rounded border border-gray-200"
                                                        onClick={() => window.open(img, '_blank')}
                                                      >
                                                        <img src={img} alt={`Activity ${idx} proof`} className="h-full w-full object-cover" />
                                                        <span className="absolute bottom-0 right-0 rounded-tl bg-black/65 px-1 text-[10px] text-white">👁</span>
                                                      </button>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>

                                              <div className="flex items-center gap-1">
                                                <label title="Take photo with camera" className="text-xs font-semibold bg-green-500 text-white px-2 py-1 rounded cursor-pointer hover:bg-green-600 transition-colors whitespace-nowrap">
                                                  <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    capture="environment"
                                                    onChange={(e) => {
                                                      if (e.target.files && e.target.files[0]) {
                                                        fileToDataUrl(e.target.files[0]).then((url) => {
                                                          setActivityProofByKey((prev) => ({
                                                            ...prev,
                                                            [key]: { ...(prev[key] ?? {}), [String(idx)]: url },
                                                          }));
                                                        });
                                                      }
                                                    }}
                                                  />
                                                  📷 Capture
                                                </label>

                                                <label title="Upload from gallery" className="text-xs font-semibold border border-[#1e3a5f] text-[#1e3a5f] px-2 py-1 rounded cursor-pointer hover:bg-[#1e3a5f] hover:text-white transition-colors whitespace-nowrap">
                                                  <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                      if (e.target.files && e.target.files[0]) {
                                                        fileToDataUrl(e.target.files[0]).then((url) => {
                                                          setActivityProofByKey((prev) => ({
                                                            ...prev,
                                                            [key]: { ...(prev[key] ?? {}), [String(idx)]: url },
                                                          }));
                                                        });
                                                      }
                                                    }}
                                                  />
                                                  🖼 Upload
                                                </label>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      <div className="mt-3 flex items-center gap-2">
                                        <p className="font-semibold text-sm text-gray-800">Activities in this section</p>
                                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                          <div
                                            className="bg-green-500 h-1.5 rounded-full transition-all"
                                            style={{ width: `${activities.length > 0 ? Math.round((proofCount / activities.length) * 100) : 0}%` }}
                                          />
                                        </div>
                                        <span className="text-xs font-semibold text-gray-600">{proofCount}/{activities.length}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    const selectedItem = selectedBySection[section.title] ?? '';
                    const isLocked = Boolean(lockedBySection[section.title]);
                    const completedEntry = bookWork.find((p) => p.category === section.title && p.isCompleted);
                    const selKey = selectedItem ? buildBookKey(section.title, selectedItem) : '';
                    const selectedOption = section.items.find((item) => getLittleLambItemLabel(item) === selectedItem);
                    const selectedActivities = selectedOption ? getLittleLambActivities(selectedOption) : [];
                    const selectedActivityIntro = selectedOption ? getLittleLambActivityIntro(selectedOption) : '';
                    return (
                      <div key={section.title} className="p-3 rounded-xl border border-blue-100 bg-blue-50/30">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className={`inline-flex items-center rounded-r-2xl px-3 py-1 text-lg font-bold leading-none text-white ${sectionTitleBadgeClass}`}>
                            {section.title}
                          </h3>
                          {section.subtitle && <span className="text-sm text-gray-600 italic">[{section.subtitle}]</span>}
                          {completedEntry && <span className="ml-auto text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">Completed</span>}
                        </div>
                        {completedEntry ? (
                          <div className="text-xs text-gray-600">Completed: <span className="font-medium">{completedEntry.requirementName}</span></div>
                        ) : (
                          <>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                              <select
                                value={selectedItem}
                                onChange={(e) => setSelectedBySection((prev) => ({ ...prev, [section.title]: e.target.value }))}
                                disabled={isLocked}
                                className={`w-full sm:flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] ${isLocked ? 'border-amber-300 bg-amber-50 text-gray-600 cursor-not-allowed' : 'border-gray-300'}`}
                              >
                                <option value="">— Select one —</option>
                                {section.items.map((item) => (
                                  <option key={getLittleLambItemLabel(item)} value={getLittleLambItemLabel(item)}>{getLittleLambItemLabel(item)}</option>
                                ))}
                              </select>
                              {!isLocked && selectedItem && (
                                <button
                                  type="button"
                                  onClick={() => void lockSection(section.title, selectedItem)}
                                  className="flex items-center gap-1 text-xs font-semibold bg-amber-500 text-white px-3 py-2 rounded-lg hover:bg-amber-600 whitespace-nowrap"
                                >
                                  🔒 Lock
                                </button>
                              )}
                              {isLocked && (
                                <button
                                  type="button"
                                  onClick={() => void unlockSection(section.title)}
                                  className="flex items-center gap-1 text-xs font-semibold border border-amber-400 text-amber-700 px-3 py-2 rounded-lg hover:bg-amber-50 whitespace-nowrap"
                                >
                                  ✏️ Edit
                                </button>
                              )}
                            </div>
                            {isLocked && (
                              <p className="text-xs text-amber-700 font-medium mb-3">🔒 Topic locked: <span className="font-semibold">{selectedItem}</span></p>
                            )}
                            {selectedItem && (
                              <>
                                {selectedActivities.length > 0 && (
                                  <>
                                    {selectedActivityIntro && (
                                      <p className="mb-2 text-sm font-medium text-gray-800">a. {selectedActivityIntro}</p>
                                    )}
                                    <div className="mb-3 rounded-lg bg-white/80 px-3 py-3 border border-blue-100 space-y-2">
                                      {selectedActivities.map((activity, idx) => {
                                        const actKey = `${selKey}:activity:${idx}`;
                                        const actProof = activityProofByKey[selKey]?.[String(idx)] ?? '';
                                        const actImages = getProofImages(actProof);
                                        return (
                                          <div key={actKey} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-2 rounded bg-gray-50 border border-gray-100">
                                            <div className="flex-1">
                                              <p className="text-xs font-medium text-gray-800">{String.fromCharCode(97 + idx)}. {activity}</p>
                                              {actImages.length > 0 && (
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                  {actImages.map((img, imgIdx) => (
                                                    <button
                                                      key={`${actKey}:${imgIdx}`}
                                                      type="button"
                                                      title="View photo"
                                                      className="relative h-10 w-10 overflow-hidden rounded border border-gray-200"
                                                      onClick={() => window.open(img, '_blank')}
                                                    >
                                                      <img src={img} alt={`Activity ${idx} proof`} className="h-full w-full object-cover" />
                                                      <span className="absolute bottom-0 right-0 rounded-tl bg-black/65 px-1 text-[10px] text-white">👁</span>
                                                    </button>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-1">

                                              <label title="Take photo with camera" className="text-xs font-semibold bg-green-500 text-white px-2 py-1 rounded cursor-pointer hover:bg-green-600 transition-colors whitespace-nowrap">
                                                <input 
                                                  type="file" 
                                                  className="hidden" 
                                                  accept="image/*" 
                                                  capture="environment"
                                                  onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                      fileToDataUrl(e.target.files[0]).then((url) => {
                                                        setActivityProofByKey((prev) => ({
                                                          ...prev,
                                                          [selKey]: { ...(prev[selKey] ?? {}), [String(idx)]: url }
                                                        }));
                                                      });
                                                    }
                                                  }}
                                                />
                                                📷 Capture
                                              </label>
                                              <label title="Upload from gallery" className="text-xs font-semibold border border-[#1e3a5f] text-[#1e3a5f] px-2 py-1 rounded cursor-pointer hover:bg-[#1e3a5f] hover:text-white transition-colors whitespace-nowrap">
                                                <input 
                                                  type="file" 
                                                  className="hidden" 
                                                  accept="image/*"
                                                  onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                      fileToDataUrl(e.target.files[0]).then((url) => {
                                                        setActivityProofByKey((prev) => ({
                                                          ...prev,
                                                          [selKey]: { ...(prev[selKey] ?? {}), [String(idx)]: url }
                                                        }));
                                                      });
                                                    }
                                                  }}
                                                />
                                                🖼 Upload
                                              </label>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <div className="mb-3 flex items-center gap-2">
                                      <p className="font-semibold text-sm text-gray-800">Activities in this section</p>
                                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                        <div
                                          className="bg-green-500 h-1.5 rounded-full transition-all"
                                          style={{ width: `${selectedActivities.length > 0 ? Math.round((Object.keys(activityProofByKey[selKey] ?? {}).length / selectedActivities.length) * 100) : 0}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-semibold text-gray-600">{Object.keys(activityProofByKey[selKey] ?? {}).length}/{selectedActivities.length}</span>
                                    </div>
                                  </>
                                )}
                                <div>
                                  <button 
                                    type="button" 
                                    onClick={() => void completeBookWork(section.title, selectedItem)} 
                                    disabled={savingKey === selKey || Object.keys(activityProofByKey[selKey] ?? {}).length === 0}
                                    className="text-xs font-semibold bg-[#1e3a5f] text-white px-3 py-1.5 rounded-lg disabled:opacity-50 w-full"
                                  >
                                    {savingKey === selKey ? 'Saving...' : 'Mark Complete'}
                                  </button>
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'bookwork' && !classSections && activeBookWorkTemplates.map((item) => {
                const existing = bookWork.find((p) => p.category === item.category && p.requirementName === item.requirementName);
                const key = buildBookKey(item.category, item.requirementName);
                const completed = Boolean(existing?.isCompleted);
                return (
                  <div key={key} className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className={`text-sm font-medium ${completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.requirementName}</p>
                        <p className="text-xs text-gray-400">{item.category}</p>
                      </div>
                      {completed ? (
                        <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">Completed</span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                          <label className="text-xs font-semibold border border-[#1e3a5f] text-[#1e3a5f] px-3 py-1.5 rounded-lg cursor-pointer hover:bg-[#1e3a5f] hover:text-white transition-colors">
                            <input type="file" className="hidden" accept="image/*" capture="environment" onChange={(e) => void onProofSelected(key, e.target.files)} />
                            {proofByKey[key] ? 'Change Proof' : 'Capture / Upload'}
                          </label>
                          <button type="button" onClick={() => void completeBookWork(item.category, item.requirementName)} disabled={savingKey === key || !proofByKey[key]} className="text-xs font-semibold bg-[#1e3a5f] text-white px-3 py-1.5 rounded-lg disabled:opacity-50">
                            {savingKey === key ? 'Saving...' : 'Mark Complete'}
                          </button>
                        </div>
                      )}
                    </div>
                    {!completed && proofByKey[key] && <p className="mt-2 text-xs text-green-600 font-medium">Photo attached</p>}
                    {getProofImages(proofByKey[key] || existing?.proofImageUrl).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {getProofImages(proofByKey[key] || existing?.proofImageUrl).map((image, index) => (
                          <img key={`${key}:${index}`} src={image} alt="Proof" className="h-16 w-16 rounded object-cover border border-gray-200" />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {activeTab === 'honors' && HONOR_TEMPLATES.map((item) => {
                const existing = honors.find((p) => p.category === item.category && p.honorName === item.honorName);
                const key = buildHonorKey(item.category, item.honorName);
                const completed = Boolean(existing?.isCompleted);

                return (
                  <div key={key} className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className={`text-sm font-medium ${completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {item.honorName}
                        </p>
                        <p className="text-xs text-gray-400">{item.category}</p>
                      </div>
                      {completed ? (
                        <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">Completed</span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                          <label className="text-xs font-semibold border border-[#1e3a5f] text-[#1e3a5f] px-3 py-1.5 rounded-lg cursor-pointer hover:bg-[#1e3a5f] hover:text-white transition-colors">
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => void onProofSelected(key, e.target.files)}
                            />
                            {proofByKey[key] ? 'Change Proof' : 'Capture / Upload'}
                          </label>
                          <button
                            type="button"
                            onClick={() => void completeHonor(item.category, item.honorName)}
                            disabled={savingKey === key || !proofByKey[key]}
                            className="text-xs font-semibold bg-[#1e3a5f] text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                          >
                            {savingKey === key ? 'Saving...' : 'Mark Complete'}
                          </button>
                        </div>
                      )}
                    </div>

                    {!completed && proofByKey[key] && <p className="mt-2 text-xs text-green-600 font-medium">Photo attached</p>}

                    {getProofImages(proofByKey[key] || existing?.proofImageUrl).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {getProofImages(proofByKey[key] || existing?.proofImageUrl).map((image, index) => (
                          <img
                            key={`${key}:${index}`}
                            src={image}
                            alt="Proof"
                            className="h-16 w-16 rounded object-cover border border-gray-200"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
        </div>
      )}
    </div>
  );
}
