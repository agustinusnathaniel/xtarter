import sortBy from 'lodash-es/sortBy';
import type { GetStaticProps } from 'next';

import type { Repo } from 'lib/types/repo';
import { fetcher } from 'lib/utils/fetcher';

import type { HomePageProps } from './types';

export const username = 'agustinusnathaniel';

export const getStaticProps: GetStaticProps<HomePageProps> = async () => {
  const data = await fetcher<Array<Repo>>({
    url: `https://api.github.com/users/${username}/repos`,
    params: {
      type: 'owner',
      per_page: 200,
      sort: 'full_name',
    },
  });
  const repos = sortBy(
    data.filter((repo) => repo.is_template),
    ['stargazers_count']
  ).reverse();

  return {
    props: {
      data: repos,
    },
    revalidate: 86400,
  };
};
