import { Flex, Link, Text } from '@chakra-ui/react';

const Footer = () => {
  return (
    <Flex
      as="footer"
      alignItems="center"
      justifyContent="center"
      paddingY={8}
      marginX="auto"
    >
      <Text fontSize="sm">
        {new Date().getFullYear()} -{' '}
        <Link
          href="https://agustinusnathaniel.com"
          isExternal
          rel="noopener noreferrer"
        >
          agustinusnathaniel.com
        </Link>
      </Text>
    </Flex>
  );
};

export default Footer;
