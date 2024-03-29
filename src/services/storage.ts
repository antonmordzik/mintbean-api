import { Collection, ObjectId } from "https://deno.land/x/mongo@v0.8.0/mod.ts";
import database from "../database.ts";
import { generate, validate } from "./jwt.ts";
import { User, IncommingUser, UserDTO } from "../interfaces/User.ts";
import { hash, verify } from "./hash.ts";

export class UserStorage {
  private collection: Collection;

  constructor(collection: string) {
    this.collection = database.collection(collection);
  }

  private transformUser(user: User): UserDTO {
    const dto = { id: user._id.$oid, ...user };
    delete dto.password;
    delete dto._id;
    return dto;
  }

  private async checkUniqEmail(email: string): Promise<boolean> {
    const users = await this.collection.find() as User[];
    return users.every((user) => user.email !== email);
  }

  private async checkUniqNickname(nickname: string): Promise<boolean> {
    const users = await this.collection.find() as User[];
    return users.every((user) => user.nickname !== nickname);
  }

  public async add(user: IncommingUser): Promise<[string, UserDTO]> {
    if (!(await this.checkUniqEmail(user.email)) && !(await this.checkUniqNickname(user.nickname))) {
      throw new Error("User with this email already exists.");
    }
    user.password = await hash(user.password);
    const result = await this.collection.insertOne(user);
    const transfer = this.transformUser({ ...user, _id: result });
    return [await generate(transfer), transfer];
  }

  public async login(
    { email, password }: Omit<IncommingUser, "nickname">,
  ): Promise<[string, UserDTO]> {
    const users = await this.collection.find() as User[];
    for (const user of users) {
      if (user.email === email) {
        const isPasswordValid = await verify(password, user.password);
        if (isPasswordValid) {
          const transfer = this.transformUser(user);
          return [await generate(transfer), transfer];
        } else {
          throw new Error("Incorrect password.");
        }
      }
    }
    throw new Error("User with this email doesn't exisits.");
  }

  public async getUsersByIds(ids: string[]): Promise<UserDTO[]> {
    const users = await this.collection.find({ _id: { $in: ids.map(id => ObjectId(id)) } });
    if (users && Array.isArray(users)) {
      return users.map(user => this.transformUser(user));
    } else {
      throw new Error('Illegal database response');
    }
  }

  public async getUserByNickname(nickname: string): Promise<UserDTO | null> {
    const user = await this.collection.findOne({ nickname });
    return user ? this.transformUser(user) : null;
  }
}
